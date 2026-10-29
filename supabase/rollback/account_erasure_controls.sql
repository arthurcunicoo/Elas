-- STAGING/REVIEW ONLY. This removes controls, not the effects of a completed deletion.
-- Restore from a verified backup if actual deleted data must be recovered.
do $$begin if exists(select 1 from private.contas_exclusao where estado='processando') then raise exception 'Finish pending erasures before rollback';end if;end $$;
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
drop trigger elas_conta_excluida on auth.users;
drop function private.finalizar_exclusao_conta();
drop function public.iniciar_exclusao_conta(uuid);
drop function private.iniciar_exclusao_conta(uuid);
do $$declare r record;begin for r in select schemaname,tablename from pg_policies where policyname='conta_ativa_guard' loop execute format('drop policy conta_ativa_guard on %I.%I',r.schemaname,r.tablename);end loop;end $$;
do $rpc_rollback$
declare r record; definition text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where n.nspname='private' and p.prosrc like '%/* elas_active_account_guard */%' loop
  definition:=pg_get_functiondef(r.oid);
  execute replace(definition, ' /* elas_active_account_guard */ if not (select private.conta_disponivel()) then raise exception ''Conta indisponível'' using errcode=''42501'';end if; /* elas_active_account_guard_end */', '');
 end loop;
end $rpc_rollback$;
drop function private.conta_disponivel();
drop table private.contas_exclusao;
