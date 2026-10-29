-- Retain request payloads for 30 days; original fingerprints live with their content.
-- An expiring, justified audit hold keeps the payload until the hold ends.
alter table public.relatos add column envio_hash text;
alter table public.solicitacoes_melhoria add column envio_hash text;
alter table private.envios add column reter_ate timestamptz, add column motivo_retencao text,
 add constraint envios_retencao_valida check ((reter_ate is null and motivo_retencao is null) or
 (reter_ate is not null and isfinite(reter_ate) and motivo_retencao is not null and char_length(btrim(motivo_retencao)) between 5 and 500));
create index envios_retencao_idx on private.envios(criado_em,usuario_id,chave);
update public.relatos r set envio_hash=encode(sha256(convert_to(e.tipo||':'||e.dados::text,'UTF8')),'hex')
 from private.envios e where e.tipo='relato' and e.chave=r.id and e.usuario_id=r.usuario_id;
update public.solicitacoes_melhoria r set envio_hash=encode(sha256(convert_to(e.tipo||':'||e.dados::text,'UTF8')),'hex')
 from private.envios e where e.tipo='melhoria' and e.chave=r.id and e.usuario_id=r.usuario_id;
create table private.retencao_envios (
 id boolean primary key default true check(id), dias integer not null default 30 check(dias between 7 and 365)
);
insert into private.retencao_envios(id) values(true);
alter table private.retencao_envios enable row level security;
revoke all on private.retencao_envios from public,anon,authenticated,service_role;
create function private.limpar_envios(p_lote integer default 1000) returns integer
 language plpgsql security invoker set search_path='' as $$
declare n integer;begin
 if p_lote is null or p_lote not between 1 and 5000 then raise exception 'Lote inválido' using errcode='22023';end if;
 with candidates as (select usuario_id,chave from private.envios
  where criado_em < now()-make_interval(days=>(select dias from private.retencao_envios where id))
  and (reter_ate is null or reter_ate<=now())
  order by criado_em,usuario_id,chave for update skip locked limit p_lote)
 delete from private.envios e using candidates c where e.usuario_id=c.usuario_id and e.chave=c.chave;
 get diagnostics n=row_count;return n;
end $$;
revoke all on function private.limpar_envios(integer) from public,anon,authenticated,service_role;
do $$begin
 if to_regnamespace('cron') is not null then
  perform cron.schedule('elas-idempotency-retention','20 * * * *','select private.limpar_envios(5000)');
 end if;
end $$;
create or replace function private.enviar_registro(p_tipo text,p_chave uuid,p_dados jsonb) returns uuid
 language plpgsql security definer set search_path='' as $$
declare old private.envios; v_id uuid; v_hash text; v_original text; v_owner uuid;begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_tipo is null or p_tipo not in ('relato','melhoria') or p_chave is null or jsonb_typeof(p_dados) is distinct from 'object' then raise exception 'Envio inválido' using errcode='22023';end if;
 insert into private.envios(usuario_id,chave,tipo,dados) values(auth.uid(),p_chave,p_tipo,p_dados) on conflict do nothing returning chave into v_id;
 if v_id is null then
  select * into old from private.envios where usuario_id=auth.uid() and chave=p_chave;
  if old.tipo is distinct from p_tipo or old.dados is distinct from p_dados then raise exception 'Esta tentativa já foi usada com outro conteúdo' using errcode='22023';end if;
  return p_chave;
 end if;
 v_hash:=encode(sha256(convert_to(p_tipo||':'||p_dados::text,'UTF8')),'hex');
 if p_tipo='relato' then select usuario_id,envio_hash into v_owner,v_original from public.relatos where id=p_chave;
 else select usuario_id,envio_hash into v_owner,v_original from public.solicitacoes_melhoria where id=p_chave;end if;
 if found then
  if v_owner is distinct from auth.uid() or v_original is distinct from v_hash then raise exception 'Esta tentativa já foi usada com outro conteúdo' using errcode='22023';end if;
  return p_chave;
 end if;
 if p_tipo='relato' then
  insert into public.relatos(id,usuario_id,categoria,descricao,local_texto,lugar_id,latitude,longitude,envio_hash)
  values(p_chave,auth.uid(),p_dados->>'categoria',btrim(p_dados->>'descricao'),btrim(p_dados->>'local_texto'),p_dados->>'lugar_id',(p_dados->>'latitude')::float8,(p_dados->>'longitude')::float8,v_hash);
 else
  insert into public.solicitacoes_melhoria(id,usuario_id,titulo,descricao,lugar_id,envio_hash)
  values(p_chave,auth.uid(),btrim(p_dados->>'titulo'),btrim(p_dados->>'descricao'),p_dados->>'lugar_id',v_hash);
 end if;
 return p_chave;
end $$;

-- Revision detects content edits and status A -> B -> A, not just a different status.
alter table public.relatos add column moderacao_revisao integer not null default 0;
alter table public.solicitacoes_melhoria add column moderacao_revisao integer not null default 0;
alter table public.avaliacoes add column moderacao_revisao integer not null default 0;
create function private.incrementar_moderacao_revisao() returns trigger
 language plpgsql security invoker set search_path='' as $$begin
 new.moderacao_revisao:=old.moderacao_revisao+1;return new;end $$;
revoke all on function private.incrementar_moderacao_revisao() from public,anon,authenticated;
create trigger moderacao_revisao before update on public.relatos for each row execute function private.incrementar_moderacao_revisao();
create trigger moderacao_revisao before update on public.solicitacoes_melhoria for each row execute function private.incrementar_moderacao_revisao();
create trigger moderacao_revisao before update on public.avaliacoes for each row execute function private.incrementar_moderacao_revisao();
create function private.fila_moderacao(p_tipo text,p_cursor jsonb,p_filtros jsonb) returns jsonb
 language plpgsql stable security definer set search_path='' as $$
declare page jsonb;rows jsonb;begin
 if auth.uid() is null or private.meu_papel() not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_tipo is null or p_tipo not in ('relato','melhoria','avaliacao','lugar','perfil') then raise exception 'Tipo inválido' using errcode='22023';end if;
 page:=public.pagina_app('admin_'||p_tipo,p_cursor,p_filtros);
 select coalesce(jsonb_agg(value||case
  when p_tipo='relato' then (select jsonb_build_object('moderacao_revisao',moderacao_revisao) from public.relatos where id=(value->>'id')::uuid)
  when p_tipo='melhoria' then (select jsonb_build_object('moderacao_revisao',moderacao_revisao) from public.solicitacoes_melhoria where id=(value->>'id')::uuid)
  when p_tipo='avaliacao' then (select jsonb_build_object('moderacao_revisao',moderacao_revisao) from public.avaliacoes where id=(value->>'id')::uuid)
  when p_tipo='lugar' then (select jsonb_build_object('atualizado_em',atualizado_em) from public.lugares where id=value->>'id')
  else '{}'::jsonb end order by n),'[]'::jsonb) into rows
 from jsonb_array_elements(page->'rows') with ordinality as x(value,n);
 return jsonb_set(page,'{rows}',rows);
end $$;
create function public.fila_moderacao(p_tipo text,p_cursor jsonb default null,p_filtros jsonb default '{}'::jsonb) returns jsonb
 language sql stable security invoker set search_path='' as $$select private.fila_moderacao(p_tipo,p_cursor,p_filtros)$$;
create function private.moderar_revisao(p_tipo text,p_id text,p_status text,p_motivo text,p_anterior text,p_revisao integer) returns void
 language plpgsql security definer set search_path='' as $$
declare rev integer;begin
 if auth.uid() is null or private.meu_papel() not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_tipo='relato' then select moderacao_revisao into rev from public.relatos where id=p_id::uuid for update;
 elsif p_tipo='melhoria' then select moderacao_revisao into rev from public.solicitacoes_melhoria where id=p_id::uuid for update;
 elsif p_tipo='avaliacao' and private.meu_papel()='admin' then select moderacao_revisao into rev from public.avaliacoes where id=p_id::uuid for update;
 else raise exception 'Acesso negado' using errcode='42501';end if;
 if rev is null or p_revisao is null or rev<>p_revisao then raise exception 'O registro mudou. Atualize antes de continuar.' using errcode='40001';end if;
 perform private.moderar(p_tipo,p_id,p_status,p_motivo,p_anterior);
end $$;
create function public.moderar_revisao(p_tipo text,p_id text,p_status text,p_motivo text,p_anterior text,p_revisao integer) returns void
 language sql security invoker set search_path='' as $$select private.moderar_revisao(p_tipo,p_id,p_status,p_motivo,p_anterior,p_revisao)$$;
create function private.classificar_lugar_revisao(p_id text,p_categoria text,p_motivo text,p_anterior text,p_revisao timestamptz) returns void
 language plpgsql security definer set search_path='' as $$
declare rev timestamptz;begin
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso negado' using errcode='42501';end if;
 select atualizado_em into rev from public.lugares where id=p_id for update;
 if rev is null or p_revisao is null or rev<>p_revisao then raise exception 'O registro mudou. Atualize antes de continuar.' using errcode='40001';end if;
 perform private.classificar_lugar(p_id,p_categoria,p_motivo,p_anterior);
end $$;
create function public.classificar_lugar_revisao(p_id text,p_categoria text,p_motivo text,p_anterior text,p_revisao timestamptz) returns void
 language sql security invoker set search_path='' as $$select private.classificar_lugar_revisao(p_id,p_categoria,p_motivo,p_anterior,p_revisao)$$;
revoke all on function private.fila_moderacao(text,jsonb,jsonb),public.fila_moderacao(text,jsonb,jsonb),
 private.moderar_revisao(text,text,text,text,text,integer),public.moderar_revisao(text,text,text,text,text,integer),
 private.classificar_lugar_revisao(text,text,text,text,timestamptz),public.classificar_lugar_revisao(text,text,text,text,timestamptz) from public,anon;
grant execute on function private.fila_moderacao(text,jsonb,jsonb),public.fila_moderacao(text,jsonb,jsonb),
 private.moderar_revisao(text,text,text,text,text,integer),public.moderar_revisao(text,text,text,text,text,integer),
 private.classificar_lugar_revisao(text,text,text,text,timestamptz),public.classificar_lugar_revisao(text,text,text,text,timestamptz) to authenticated;
