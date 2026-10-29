grant usage on schema private to service_role;
grant select,insert,update on public.lugares to service_role;
-- A bounded, machine-only queue. Browsing the map never triggers an external import.
create table private.catalog_job_config (
 id boolean primary key default true check(id),endpoint text,token_hash text
);
insert into private.catalog_job_config(id) values(true);
create table private.catalog_tiles (
 id uuid primary key default gen_random_uuid(),area_id text not null references public.service_areas(id) on delete cascade,
 south double precision not null,west double precision not null,north double precision not null,east double precision not null,
 next_due timestamptz not null default now(),lease uuid,lease_until timestamptz,attempts integer not null default 0,
 disabled boolean not null default false,updated_at timestamptz,last_error text,received integer not null default 0,
 unique(area_id,south,west,north,east)
);
create index catalog_tiles_area on private.catalog_tiles(area_id);
create index catalog_tiles_due on private.catalog_tiles(next_due,id) where not disabled;
alter table private.catalog_job_config enable row level security;
alter table private.catalog_tiles enable row level security;
create policy catalog_job_machine on private.catalog_job_config for all to service_role using(true) with check(true);
create policy catalog_tiles_machine on private.catalog_tiles for all to service_role using(true) with check(true);
revoke all on private.catalog_job_config,private.catalog_tiles from public,anon,authenticated;

create function private.reservar_catalogo_job(p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare tile private.catalog_tiles;token uuid;begin
 if p_token_hash is null or char_length(p_token_hash)<>64 or not exists(select 1 from private.catalog_job_config where id and token_hash=p_token_hash and endpoint is not null) then raise exception 'Acesso negado' using errcode='42501';end if;
 insert into private.catalog_tiles(area_id,south,west,north,east)
 select a.id,greatest(a.south,y*.04),greatest(a.west,x*.04),least(a.north,(y+1)*.04),least(a.east,(x+1)*.04)
 from public.service_areas a cross join lateral generate_series(floor(a.south/.04)::integer,ceil(a.north/.04)::integer-1) y
 cross join lateral generate_series(floor(a.west/.04)::integer,ceil(a.east/.04)::integer-1) x
 where a.ativa on conflict do nothing;
 select t.* into tile from private.catalog_tiles t join public.service_areas a on a.id=t.area_id and a.ativa
 where not t.disabled and t.south>=a.south and t.north<=a.north and t.west>=a.west and t.east<=a.east and t.next_due<=now() and (t.lease_until is null or t.lease_until<=now())
 order by t.next_due,t.id for update of t skip locked limit 1;
 if not found then return null;end if;
 token:=gen_random_uuid();update private.catalog_tiles set lease=token,lease_until=now()+interval '2 minutes' where id=tile.id;
 return jsonb_build_object('lease',token,'bounds',jsonb_build_object('south',tile.south,'west',tile.west,'north',tile.north,'east',tile.east),
 'area',(select jsonb_build_object('id',id,'nome',nome,'estado',estado) from public.service_areas where id=tile.area_id));
end $$;
create function public.reservar_catalogo_job(p_token_hash text) returns jsonb language sql security invoker set search_path='' as $$select private.reservar_catalogo_job(p_token_hash)$$;
create function private.finalizar_catalogo_job(p_lease uuid,p_recebidos integer,p_erro text) returns void language plpgsql security definer set search_path='' as $$
declare tile private.catalog_tiles;midlat double precision;midlon double precision;begin
 if p_recebidos is null or p_recebidos not between 0 and 400 then raise exception 'Contagem inválida' using errcode='22023';end if;
 select * into tile from private.catalog_tiles where lease=p_lease and lease_until>now() for update;
 if not found then raise exception 'Reserva expirada' using errcode='22023';end if;
 update private.catalog_tiles set lease=null,lease_until=null,received=p_recebidos,last_error=left(p_erro,80),
 attempts=case when p_erro is null then 0 else least(attempts+1,8) end,
 updated_at=case when p_erro is null then now() else updated_at end,
 next_due=now()+case when p_erro is null then interval '1 day' else interval '15 minutes'*power(2,least(attempts,5)) end
 where id=tile.id;
 if p_erro is null and p_recebidos>=400 and greatest(tile.north-tile.south,tile.east-tile.west)>.0025 then
  midlat:=(tile.north+tile.south)/2;midlon:=(tile.east+tile.west)/2;
  insert into private.catalog_tiles(area_id,south,west,north,east) values
   (tile.area_id,tile.south,tile.west,midlat,midlon),(tile.area_id,tile.south,midlon,midlat,tile.east),
   (tile.area_id,midlat,tile.west,tile.north,midlon),(tile.area_id,midlat,midlon,tile.north,tile.east) on conflict do nothing;
  update private.catalog_tiles set disabled=true where id=tile.id;
 end if;
end $$;
create function public.finalizar_catalogo_job(p_lease uuid,p_recebidos integer default 0,p_erro text default null) returns void language sql security invoker set search_path='' as $$select private.finalizar_catalogo_job(p_lease,p_recebidos,p_erro)$$;
revoke all on function private.reservar_catalogo_job(text),public.reservar_catalogo_job(text),private.finalizar_catalogo_job(uuid,integer,text),public.finalizar_catalogo_job(uuid,integer,text) from public,anon,authenticated,service_role;
grant execute on function private.reservar_catalogo_job(text),public.reservar_catalogo_job(text),private.finalizar_catalogo_job(uuid,integer,text),public.finalizar_catalogo_job(uuid,integer,text) to service_role;

-- Owner-only installation step. No URL, token or administrative key is embedded in migration history.
-- pg_cron, pg_net and Vault are platform capabilities; local tests exercise the queue independently.
create function private.programar_catalogo(p_endpoint text) returns bigint language plpgsql security invoker set search_path='' as $fn$
declare token text;job bigint;begin
 if p_endpoint is null or p_endpoint !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/catalog-refresh$' then raise exception 'Endpoint inválido';end if;
 if to_regnamespace('vault') is null then raise exception 'Configure o Supabase Vault antes de agendar o catálogo';end if;
 execute 'create extension if not exists pg_cron with schema pg_catalog';
 execute 'create extension if not exists pg_net with schema extensions';
 select decrypted_secret into token from vault.decrypted_secrets where name='elas_catalog_job_token';
 if token is null then token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform vault.create_secret(token,'elas_catalog_job_token','ELAS scheduled catalog worker');end if;
 update private.catalog_job_config set endpoint=p_endpoint,token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') where id;
 select cron.schedule('elas-catalog-refresh','*/10 * * * *',$job$
  select net.http_post(url:=(select endpoint from private.catalog_job_config where id),
   headers:=jsonb_build_object('Content-Type','application/json','x-catalog-job-key',(select decrypted_secret from vault.decrypted_secrets where name='elas_catalog_job_token')),
   body:='{}'::jsonb,timeout_milliseconds:=60000);
 $job$) into job;
 return job;
end $fn$;
revoke all on function private.programar_catalogo(text) from public,anon,authenticated,service_role;
notify pgrst,'reload schema';

-- At most two matches per imported OSM point: exact provider reference and
-- nearest same-name canonical candidate. No neighbourhood-wide transfer.
create function public.candidatos_catalogo(p_lugares jsonb) returns jsonb language plpgsql stable security invoker set search_path='' as $$
begin
 if jsonb_typeof(p_lugares) is distinct from 'array' or jsonb_array_length(p_lugares)>400 then raise exception 'Lote inválido' using errcode='22023';end if;
 return (with incoming as materialized (select * from jsonb_to_recordset(p_lugares) as x(nome text,latitude double precision,longitude double precision,referencia_externa text)),
 matches as (
  select l.id,l.nome,l.latitude,l.longitude,l.referencia_externa,l.duplicado_de from incoming i join public.lugares l on l.origem='osm' and l.referencia_externa=i.referencia_externa
  union
  select q.* from incoming i cross join lateral (
   select l.id,l.nome,l.latitude,l.longitude,l.referencia_externa,l.duplicado_de from public.lugares l
   where l.id not like 'osm:%' and l.duplicado_de is null and not l.oculto_catalogo and private.normalizar_busca(l.nome)=private.normalizar_busca(i.nome)
   and l.localizacao operator(gis.&&) gis.st_makeenvelope(i.longitude-.001,i.latitude-.001,i.longitude+.001,i.latitude+.001,4326)::gis.geography
   and power(l.latitude-i.latitude,2)+power(l.longitude-i.longitude,2)<.000001
   order by power(l.latitude-i.latitude,2)+power(l.longitude-i.longitude,2),l.id limit 1
  ) q
 ) select coalesce(jsonb_agg(to_jsonb(m)),'[]'::jsonb) from matches m);
end $$;
revoke all on function public.candidatos_catalogo(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.candidatos_catalogo(jsonb) to service_role;
