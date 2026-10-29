-- Spatial and text indexes; no existing account or contribution is replaced.
create schema if not exists extensions;
create schema if not exists gis;
create extension if not exists pg_trgm with schema extensions;
create extension if not exists postgis with schema gis;
grant usage on schema gis,extensions to authenticated,service_role;
create function private.normalizar_busca(p_texto text) returns text language sql immutable parallel safe security invoker set search_path='' as $$
 select translate(lower(btrim(coalesce(p_texto,''))),'áàâãéêíóôõúüç','aaaaeeiooouuc')
$$;
create function private.padrao_busca(p_texto text) returns text language sql immutable parallel safe security invoker set search_path='' as $$
 select case when char_length(t)>=3 then '%' else '' end||replace(replace(replace(t,chr(92),chr(92)||chr(92)),'%',chr(92)||'%'),'_',chr(92)||'_')||'%' from (select private.normalizar_busca(left(coalesce(p_texto,''),100)) t) q
$$;
revoke all on function private.normalizar_busca(text),private.padrao_busca(text) from public,anon;
grant execute on function private.normalizar_busca(text),private.padrao_busca(text) to authenticated,service_role;
create index lugares_busca_trgm on public.lugares using gin (private.normalizar_busca(nome||' '||endereco) extensions.gin_trgm_ops);
create index lugares_nome_trgm on public.lugares using gin (private.normalizar_busca(nome) extensions.gin_trgm_ops);
create index relatos_busca_trgm on public.relatos using gin (private.normalizar_busca(local_texto||' '||descricao) extensions.gin_trgm_ops);
create index melhorias_busca_trgm on public.solicitacoes_melhoria using gin (private.normalizar_busca(titulo||' '||descricao) extensions.gin_trgm_ops);
create index avaliacoes_busca_trgm on public.avaliacoes using gin (private.normalizar_busca(comentario) extensions.gin_trgm_ops);
create index perfis_busca_trgm on public.perfis using gin (private.normalizar_busca(nome) extensions.gin_trgm_ops);

create table public.service_areas (
 id text primary key check(id ~ '^[a-z0-9_-]{1,60}$'),
 nome text not null check(char_length(nome) between 1 and 100),
 estado text not null check(char_length(estado) between 1 and 40),
 timezone text not null default 'America/Sao_Paulo',
 south double precision not null,north double precision not null,west double precision not null,east double precision not null,
 latitude double precision not null,longitude double precision not null,
 latitude_delta double precision not null default .016,longitude_delta double precision not null default .016,
 ativa boolean not null default true,prioridade integer not null default 0,
 check(south>=-85 and north<=85 and south<north and west>=-180 and east<=180 and west<east),
 check(latitude between south and north and longitude between west and east),
 check(latitude_delta>0 and latitude_delta<=5 and longitude_delta>0 and longitude_delta<=5)
);
alter table public.service_areas enable row level security;
revoke all on public.service_areas from public,anon,authenticated;
grant select on public.service_areas to authenticated;
create policy service_areas_read on public.service_areas for select to authenticated using(ativa);
insert into public.service_areas(id,nome,estado,south,north,west,east,latitude,longitude,prioridade)
values('criciuma','Criciúma','SC',-28.85,-28.55,-49.55,-49.2,-28.678,-49.369,100);

create function private.caixa_mapa(p_sul double precision,p_oeste double precision,p_norte double precision,p_leste double precision) returns gis.geometry
language plpgsql immutable parallel safe security invoker set search_path='' as $$
begin
 if p_sul is null or p_oeste is null or p_norte is null or p_leste is null or not(p_sul>=-85 and p_norte<=85 and p_sul<p_norte and p_oeste>=-180 and p_leste<=180 and p_oeste<p_leste and p_norte-p_sul<=5 and p_leste-p_oeste<=5) then raise exception 'Área inválida' using errcode='22023';end if;
 return gis.st_makeenvelope(p_oeste,p_sul,p_leste,p_norte,4326);
end $$;
revoke all on function private.caixa_mapa(double precision,double precision,double precision,double precision) from public,anon;
grant execute on function private.caixa_mapa(double precision,double precision,double precision,double precision) to authenticated,service_role;
alter table public.relatos add column localizacao gis.geography(Point,4326) generated always as (
 case when latitude is not null and longitude is not null then gis.st_setsrid(gis.st_makepoint(longitude,latitude),4326)::gis.geography end
) stored;
alter table public.lugares add column localizacao gis.geography(Point,4326) generated always as (gis.st_setsrid(gis.st_makepoint(longitude,latitude),4326)::gis.geography) stored;
create index relatos_geo_gist on public.relatos using gist(localizacao);
create index lugares_geo_gist on public.lugares using gist(localizacao) where duplicado_de is null and not oculto_catalogo;


create function private.mapa_relatos(p_sul double precision,p_oeste double precision,p_norte double precision,p_leste double precision,p_zoom integer default 15) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare box gis.geometry:=private.caixa_mapa(p_sul,p_oeste,p_norte,p_leste);step double precision;result jsonb;
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_zoom is null or p_zoom not between 0 and 22 then raise exception 'Zoom inválido' using errcode='22023';end if;
 step:=greatest(360.0/power(2.0,p_zoom)/4.0,greatest(p_norte-p_sul,p_leste-p_oeste)/6.0);
 with candidates as materialized (
  select id,latitude,longitude
  from public.relatos r where (r.status='verificado' or (r.status='pendente' and r.usuario_id=auth.uid())) and r.localizacao operator(gis.&&) box::gis.geography
  and gis.st_covers(box,r.localizacao::gis.geometry)
 ),groups as (
  select floor(longitude/step) x,floor(latitude/step) y,count(*) count,avg(latitude) latitude,avg(longitude) longitude,
  min(latitude) south,max(latitude) north,min(longitude) west,max(longitude) east,
  min(id::text) report_id
  from candidates c group by floor(longitude/step),floor(latitude/step)
 ) select jsonb_build_object('total',(select count(*) from candidates),'nodes',coalesce(jsonb_agg(jsonb_build_object(
 'id',case when count=1 then report_id else 'cluster:'||p_zoom||':'||x||':'||y||':'||step end,
 'count',count,'latitude',latitude,'longitude',longitude,'bounds',jsonb_build_object('south',south,'north',north,'west',west,'east',east),'report',case when count=1 then (select jsonb_build_object('id',r.id,'lugar_id',r.lugar_id,'categoria',r.categoria,'descricao',r.descricao,'local_texto',r.local_texto,'latitude',r.latitude,'longitude',r.longitude,'status',r.status,'criado_em',r.criado_em) from public.relatos r where r.id=report_id::uuid) else null end
 ) order by y,x),'[]'::jsonb)) into result from groups;
 return result;
end $$;
create function public.mapa_relatos(p_sul double precision,p_oeste double precision,p_norte double precision,p_leste double precision,p_zoom integer default 15) returns jsonb language sql stable security invoker set search_path='' as $$select private.mapa_relatos(p_sul,p_oeste,p_norte,p_leste,p_zoom)$$;
revoke all on function private.mapa_relatos(double precision,double precision,double precision,double precision,integer),public.mapa_relatos(double precision,double precision,double precision,double precision,integer) from public,anon;
grant execute on function private.mapa_relatos(double precision,double precision,double precision,double precision,integer),public.mapa_relatos(double precision,double precision,double precision,double precision,integer) to authenticated;

create function private.relevancia_lugar(p_nome text,p_categoria text,p_app text,p_foto text,p_verificado timestamptz) returns integer
language sql immutable parallel safe security invoker set search_path='' as $$
 select case
 when private.normalizar_busca(p_nome)=any(array['praca nereu ramos','praca do congresso','parque das nacoes','parque municipal morro do ceu','shopping della','criciuma shopping','hospital sao jose','hospital sao joao batista','hospital santa catarina','hospital da unimed criciuma','hospital unimed criciuma']) then 100
 when private.normalizar_busca(p_nome) ~ '^(canteiro|rotula|rotatoria|estacionamento)( |$)' or private.normalizar_busca(p_nome)=any(array['galeria','lojas em geral','parque dos predios','parque hotel zata','parque igreja universal','casario parque']) then 4
 else coalesce(case when p_categoria='hospital' and private.normalizar_busca(p_nome) !~ '^hospital( |$)' then 20 when p_categoria='university' and private.normalizar_busca(p_nome) ~ '(medic|clinica)' then 20 else
 (jsonb_build_object('mall',64,'shopping_mall',64,'stadium',60,'university',52,'college',40,'park',48,'nature_reserve',48,'hospital',46,'supermarket',38,'theatre',36,'library',32,'sports_centre',30,'school',26,'police',28,'marketplace',36,'bank',22,'pharmacy',22,'restaurant',18,'cafe',16,'fuel',22)->>p_categoria)::integer end,
 (jsonb_build_object('parks',44,'markets',28,'education',24,'health',18)->>p_app)::integer,10)+(case when p_verificado is not null then 4 else 0 end)+(case when p_foto is not null and p_foto<>'' then 2 else 0 end) end
$$;
revoke all on function private.relevancia_lugar(text,text,text,text,timestamptz) from public,anon;
grant execute on function private.relevancia_lugar(text,text,text,text,timestamptz) to authenticated,service_role;
alter table public.lugares add column relevancia integer generated always as (private.relevancia_lugar(nome,categoria,categoria_app,foto_url,dados_verificados_em)) stored;
create index lugares_relevancia on public.lugares(relevancia desc,id) where duplicado_de is null and not oculto_catalogo;

create function private.categoria_lugar(p_tag text,p_app text) returns text language sql immutable parallel safe security invoker set search_path='' as $$select case when p_app=any(array['parks','restaurants','cafes','markets','shops','health','education','sports','services','other']) then p_app when lower(btrim(p_tag))=any(array['park','garden','playground','nature_reserve','recreation_ground']) then 'parks' when lower(btrim(p_tag))=any(array['restaurant','fast_food','food_court']) then 'restaurants' when lower(btrim(p_tag))=any(array['cafe','bar','pub','ice_cream']) then 'cafes' when lower(btrim(p_tag))=any(array['supermarket','convenience','greengrocer','marketplace','grocery']) then 'markets' when lower(btrim(p_tag))=any(array['mall','clothes','shoes','hardware','doityourself','variety_store','electronics','gift','pet','beauty','party','car','bakery','butcher','bookshop','books','florist','furniture','department_store','jewelry','optician','sports','mobile_phone','stationery','kiosk']) then 'shops' when lower(btrim(p_tag))=any(array['pharmacy','hospital','clinic','doctors','dentist']) then 'health' when lower(btrim(p_tag))=any(array['school','university','college','kindergarten','library']) then 'education' when lower(btrim(p_tag))=any(array['fitness_centre','sports_centre','pitch','swimming_pool']) then 'sports' when lower(btrim(p_tag))=any(array['bank','police','fuel','car_repair','hairdresser','ticket','community_centre','theatre','post_office','laundry','atm']) then 'services' else 'other' end$$;
revoke all on function private.categoria_lugar(text,text) from public,anon;
grant execute on function private.categoria_lugar(text,text) to authenticated,service_role;

create function public.mapa_lugares(p_sul double precision,p_oeste double precision,p_norte double precision,p_leste double precision,p_categoria text default 'all') returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare box gis.geometry:=private.caixa_mapa(p_sul,p_oeste,p_norte,p_leste);result jsonb;
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_categoria is null or p_categoria not in ('all','parks','restaurants','cafes','markets','shops','health','education','sports','services','other') then raise exception 'Categoria inválida' using errcode='22023';end if;
 if not exists(select 1 from public.service_areas a where a.ativa and a.north>p_sul and a.south<p_norte and a.east>p_oeste and a.west<p_leste) then raise exception 'Ainda não há atendimento nesta região. Escolha uma cidade disponível.' using errcode='22023';end if;
 with candidates as materialized (
  select id,latitude,longitude,relevancia,atualizado_em from public.lugares l
  where l.duplicado_de is null and not l.oculto_catalogo and l.localizacao operator(gis.&&) box::gis.geography and gis.st_covers(box,l.localizacao::gis.geometry)
  and exists(select 1 from public.service_areas a where a.ativa and l.latitude between a.south and a.north and l.longitude between a.west and a.east)
  and (p_categoria='all' or private.categoria_lugar(l.categoria,l.categoria_app)=p_categoria)
 ),promoted as materialized (select * from candidates where relevancia>=38 order by relevancia desc,id limit 200),
 ranked as (select c.*,row_number() over(partition by floor(latitude/.002),floor(longitude/.002) order by relevancia desc,id) cell_order from candidates c where not exists(select 1 from promoted p where p.id=c.id)),
 selected as (select id,relevancia from promoted union all select id,relevancia from (select * from ranked order by cell_order,relevancia desc,id limit (500-(select count(*) from promoted))) r),
 projected as (select l.id,l.nome,l.endereco,l.latitude,l.longitude,l.foto_url,l.origem,l.referencia_externa,l.categoria,l.categoria_app,l.atualizado_em,l.foto_autor,l.foto_licenca,l.foto_fonte,l.foto_data,l.fonte_dados,l.dados_verificados_em,l.relevancia from selected s join public.lugares l on l.id=s.id)
 select jsonb_build_object('places',coalesce((select jsonb_agg(to_jsonb(p) order by relevancia desc,id) from projected p),'[]'::jsonb),'total',(select count(*) from candidates),'displayLimited',(select count(*)>500 from candidates),'refreshing',false,'warning','','selection','relevance','updatedAt',(select max(atualizado_em) from candidates)) into result;
 return result;
end $$;
revoke all on function public.mapa_lugares(double precision,double precision,double precision,double precision,text) from public,anon;
grant execute on function public.mapa_lugares(double precision,double precision,double precision,double precision,text) to authenticated;

create or replace function private.pagina_dados_privados(p_lista text,p_cursor jsonb,p_filtros jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_contexto jsonb:=private.contexto_pagina(p_lista,p_cursor,p_filtros);v_key text:=v_contexto->>'key';v_id text:=v_contexto->>'id';v_papel text:=private.meu_papel();v_autor uuid;
 v_busca text:=private.padrao_busca(p_filtros->>'busca');v_status text:=coalesce(p_filtros->>'status','');v_tipo text:=p_filtros->>'tipo';v_registro text:=p_filtros->>'id';begin
 if p_lista='relatos_area' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
 select r.id,r.lugar_id,r.categoria,r.descricao,r.local_texto,r.latitude,r.longitude,r.status,r.criado_em,r.criado_em as _key,r.id as _id
 from public.relatos r where (r.status='verificado' or (r.status='pendente' and r.usuario_id=auth.uid()))
 and r.localizacao operator(gis.&&) private.caixa_mapa((p_filtros->'area'->>0)::double precision,(p_filtros->'area'->>1)::double precision,(p_filtros->'area'->>2)::double precision,(p_filtros->'area'->>3)::double precision)::gis.geography
 and gis.st_covers(private.caixa_mapa((p_filtros->'area'->>0)::double precision,(p_filtros->'area'->>1)::double precision,(p_filtros->'area'->>2)::double precision,(p_filtros->'area'->>3)::double precision),r.localizacao::gis.geometry)
 and (r.criado_em,r.id)<(coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='registros_relato' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.categoria,r.descricao,r.local_texto,r.lugar_id,r.status,r.criado_em,r.atualizado_em,r.criado_em as _key,r.id as _id from public.relatos r where r.usuario_id=auth.uid() and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='registros_melhoria' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.titulo,r.descricao,r.lugar_id,r.status,r.criado_em,r.atualizado_em,r.criado_em as _key,r.id as _id from public.solicitacoes_melhoria r where r.usuario_id=auth.uid() and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='enquetes' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select e.id,e.pergunta,e.encerra_em,(select v.opcao_id from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid()) minha_opcao,
 e.encerra_em<=now() encerrada,(e.encerra_em<=now() or exists(select 1 from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid())) resultados_visiveis,private.opcoes_enquete(e.id) opcoes,e.criado_em as _key,e.id as _id from public.enquetes e where e.publicado and (not(p_filtros?'encerradas') or (e.encerra_em<=(v_contexto->>'at')::timestamptz)=(p_filtros->>'encerradas')::boolean) and (e.criado_em,e.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by e.criado_em desc,e.id desc limit 21) q);end if;
 if p_lista='historico' then
  if v_tipo='relato' then select usuario_id into v_autor from public.relatos where id=v_registro::uuid;
  elsif v_tipo='melhoria' then select usuario_id into v_autor from public.solicitacoes_melhoria where id=v_registro::uuid;
  elsif v_tipo='avaliacao' then select usuario_id into v_autor from public.avaliacoes where id=v_registro::uuid;
  elsif v_tipo is distinct from 'lugar' then raise exception 'Tipo inválido' using errcode='22023';end if;
  if not(v_papel='admin' or (v_papel='moderador' and v_tipo in ('relato','melhoria')) or coalesce(v_autor=auth.uid(),false)) then raise exception 'Acesso negado' using errcode='42501';end if;
  return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select h.id,h.anterior,h.novo,h.motivo,h.criado_em,case when h.responsavel_id=auth.uid() then 'Você' when v_papel in ('admin','moderador') then coalesce(p.nome,'Equipe de moderação') else 'Equipe de moderação' end responsavel,h.criado_em as _key,h.id as _id from public.historico_status h left join public.perfis p on p.id=h.responsavel_id where h.tipo=v_tipo and h.registro_id=v_registro and (h.criado_em,h.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by h.criado_em desc,h.id desc limit 21) q);
 end if;
 if v_papel not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_lista='admin_relato' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.categoria,r.descricao,r.local_texto,r.lugar_id,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.relatos r where private.normalizar_busca(r.local_texto||' '||r.descricao) like v_busca and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_melhoria' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.titulo,r.descricao,r.lugar_id,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.solicitacoes_melhoria r where private.normalizar_busca(r.titulo||' '||r.descricao) like v_busca and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_avaliacao' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,l.nome titulo,r.comentario descricao,r.sentimento,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.avaliacoes r join public.lugares l on l.id=r.lugar_id where r.id in (select a.id from public.avaliacoes a where private.normalizar_busca(a.comentario) like v_busca union select a.id from public.avaliacoes a join public.lugares x on x.id=a.lugar_id where private.normalizar_busca(x.nome) like v_busca) and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_perfil' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.nome titulo,r.criado_em,r.criado_em as _key,r.id as _id from public.perfis r where private.normalizar_busca(r.nome) like v_busca and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_lugar' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.nome titulo,r.endereco descricao,r.categoria,r.categoria_app,r.criado_em,r.nome as _key,r.id as _id from public.lugares r where private.normalizar_busca(r.nome) like v_busca and (r.nome,r.id) > (coalesce(v_key,''),coalesce(v_id,'')) order by r.nome,r.id limit 21) q);end if;
 raise exception 'Acesso negado' using errcode='42501';
end $$;
create or replace function public.pagina_app(p_lista text,p_cursor jsonb default null,p_filtros jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security invoker set search_path='' as $$
declare v_contexto jsonb:=private.contexto_pagina(p_lista,p_cursor,p_filtros);v_key text:=v_contexto->>'key';v_id text:=v_contexto->>'id';v_at timestamptz:=(v_contexto->>'at')::timestamptz;v_rows jsonb;
 v_categoria text:=coalesce(p_filtros->>'categoria','all');v_tags text[];v_conhecidas text[];begin
 if p_lista='relatos' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.lugar_id,r.categoria,r.descricao,r.local_texto,r.latitude,r.longitude,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.relatos r where (not coalesce((p_filtros->>'publicas')::boolean,false) or r.status in ('verificado','resolvido')) and (not coalesce((p_filtros->>'recentes')::boolean,false) or (r.criado_em>=v_at-interval '24 hours' and r.criado_em<=v_at and r.status not in ('resolvido','retirado'))) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);
 elsif p_lista='melhorias' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.titulo,r.descricao,r.lugar_id,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.solicitacoes_melhoria r where r.status<>'retirado' and (not coalesce((p_filtros->>'publicas')::boolean,false) or r.status in ('em_andamento','concluida')) and (coalesce(p_filtros->>'status','')='' or r.status=p_filtros->>'status') and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);
 elsif p_lista='avaliacoes' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.lugar_id,r.sentimento,r.comentario,r.atualizado_em,r.status,jsonb_build_object('nome',l.nome) lugares,r.atualizado_em as _key,r.id as _id from public.avaliacoes r join public.lugares l on l.id=r.lugar_id where r.usuario_id=auth.uid() and (r.atualizado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.atualizado_em desc,r.id desc limit 21) q);
 elsif p_lista='favoritos' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select l.*,f.criado_em as _key,f.lugar_id as _id from public.favoritos f join public.lugares l on l.id=f.lugar_id where f.usuario_id=auth.uid() and (f.criado_em,f.lugar_id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id,'')) order by f.criado_em desc,f.lugar_id desc limit 21) q);
 elsif p_lista='notificacoes' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.titulo,r.mensagem,r.tipo,r.registro_id,r.lida,r.criado_em,r.criado_em as _key,r.id as _id from public.notificacoes r where r.usuario_id=auth.uid() and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);
 elsif p_lista='eventos' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select e.id,e.titulo,e.descricao,e.local_texto,e.inicia_em,e.cancelado,exists(select 1 from public.inscricoes i where i.evento_id=e.id and i.usuario_id=auth.uid()) inscrito,e.inicia_em as _key,e.id as _id from public.eventos e where e.publicado and (case when coalesce((p_filtros->>'passados')::boolean,false) then e.inicia_em<v_at or e.cancelado else e.inicia_em>=v_at and not e.cancelado end) and (e.inicia_em,e.id) > (coalesce(v_key::timestamptz,'-infinity'::timestamptz),coalesce(v_id::uuid,'00000000-0000-0000-0000-000000000000'::uuid)) order by e.inicia_em,e.id limit 21) q);
 elsif p_lista='publicacoes_evento' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.*,r.criado_em as _key,r.id as _id from public.eventos r where (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);
 elsif p_lista='publicacoes_enquete' then v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.*,r.criado_em as _key,r.id as _id from public.enquetes r where (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);
 elsif p_lista='lugares' then
  if v_categoria not in ('all','parks','restaurants','cafes','markets','shops','health','education','sports','services','other')
    or coalesce(jsonb_typeof(p_filtros->'tags'),'array')<>'array' or coalesce(jsonb_typeof(p_filtros->'conhecidas'),'array')<>'array' then raise exception 'Busca inválida' using errcode='22023';end if;
  select coalesce(array_agg(value),'{}') into v_tags from jsonb_array_elements_text(coalesce(p_filtros->'tags','[]'::jsonb));
  select coalesce(array_agg(value),'{}') into v_conhecidas from jsonb_array_elements_text(coalesce(p_filtros->'conhecidas','[]'::jsonb));
  if cardinality(v_tags)>100 or cardinality(v_conhecidas)>100 then raise exception 'Busca inválida' using errcode='22023';end if;
  v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select l.*,l.nome as _key,l.id as _id from public.lugares l where l.duplicado_de is null and not l.oculto_catalogo and (private.normalizar_busca(l.nome||' '||l.endereco) like private.padrao_busca(p_filtros->>'busca') or (char_length(private.normalizar_busca(p_filtros->>'busca'))>=3 and private.normalizar_busca(p_filtros->>'busca') ~ '^[[:alnum:] ]+$' and private.normalizar_busca(l.nome) operator(extensions.%) private.normalizar_busca(left(p_filtros->>'busca',100))))
 and (v_categoria='all' or l.categoria_app=v_categoria or (l.categoria_app is null and case when v_categoria='other' then l.categoria is null or not(l.categoria=any(v_conhecidas)) else l.categoria=any(v_tags) end)) and (l.nome,l.id) > (coalesce(v_key,''),coalesce(v_id,'')) order by l.nome,l.id limit 21) q);
 elsif p_lista in ('enquetes','relatos_area','registros_relato','registros_melhoria','historico','admin_relato','admin_melhoria','admin_avaliacao','admin_perfil','admin_lugar') then v_rows:=private.pagina_dados_privados(p_lista,p_cursor,p_filtros);
 else raise exception 'Lista inválida' using errcode='22023';end if;
 return private.resultado_pagina(v_rows,v_contexto);
end $$;

create or replace function public.versao_app() returns integer language sql immutable security invoker set search_path='' as $$select 8$$;
notify pgrst,'reload schema';
