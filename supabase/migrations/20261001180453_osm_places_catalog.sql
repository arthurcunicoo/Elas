-- Public-place catalog; only the authenticated Edge Function imports OSM data.
alter table public.lugares
  add column origem text not null default 'manual' check (origem in ('manual','osm')),
  add column referencia_externa text,
  add column categoria text,
  add column atualizado_em timestamptz not null default now(),
  add constraint lugares_osm_referencia check (origem <> 'osm' or referencia_externa ~ '^(node|way|relation)/[1-9][0-9]*$');
create unique index lugares_origem_referencia_idx on public.lugares(origem, referencia_externa) where referencia_externa is not null;
create index lugares_coordenadas_idx on public.lugares(latitude, longitude);
create table public.catalogo_osm_cache (
  chave text primary key check (char_length(chave) <= 100),
  atualizado_em timestamptz not null default '1970-01-01',
  bloqueado_ate timestamptz not null default '1970-01-01'
);
alter table public.catalogo_osm_cache enable row level security;
revoke all on public.catalogo_osm_cache from public, anon, authenticated;
grant all on public.catalogo_osm_cache to service_role;
grant select, insert, update on public.lugares to service_role;
-- One upstream request per snapped area/day; a lease avoids concurrent stampedes.
create function public.reservar_consulta_osm(p_chave text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_chave text;
begin
  if exists (select 1 from public.catalogo_osm_cache where chave=p_chave and atualizado_em >= now()-interval '1 day') then return false; end if;
  -- Shared upstream throttle, even when different areas are requested at once.
  insert into public.catalogo_osm_cache(chave,bloqueado_ate) values ('upstream',now()+interval '3 seconds')
  on conflict(chave) do update set bloqueado_ate=excluded.bloqueado_ate
  where public.catalogo_osm_cache.bloqueado_ate<now()
  returning chave into v_chave;
  if v_chave is null then return false; end if;
  v_chave:=null;
  insert into public.catalogo_osm_cache(chave,bloqueado_ate)
  values (p_chave, now() + interval '60 seconds')
  on conflict(chave) do update set bloqueado_ate = excluded.bloqueado_ate
  where public.catalogo_osm_cache.bloqueado_ate < now()
    and public.catalogo_osm_cache.atualizado_em < now() - interval '1 day'
  returning chave into v_chave;
  return v_chave is not null;
end;
$$;
revoke all on function public.reservar_consulta_osm(text) from public, anon, authenticated;
grant execute on function public.reservar_consulta_osm(text) to service_role;
