-- Match the shared lease already deployed on 2026-10-01.
create or replace function public.reservar_consulta_osm(p_chave text) returns boolean
language plpgsql security invoker set search_path = '' as $$
declare v_chave text;
begin
  if exists (select 1 from public.catalogo_osm_cache where chave=p_chave and atualizado_em >= now()-interval '1 day') then return false; end if;
  -- Shared upstream throttle, even when different areas are requested at once.
  insert into public.catalogo_osm_cache(chave,bloqueado_ate) values ('upstream',now()+interval '60 seconds')
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
