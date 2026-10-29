-- Counts are withheld at the database boundary, including legacy poll clients.
create function private.opcoes_enquete(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_visivel boolean;begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 select e.encerra_em<=now() or exists(select 1 from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid())
 into v_visivel from public.enquetes e where e.id=p_id and e.publicado;
 if not found then return '[]'::jsonb;end if;
 return (select coalesce(jsonb_agg(to_jsonb(o) order by o.ordem),'[]'::jsonb) from (
  select op.id,op.texto,op.ordem,case when v_visivel then (select count(*) from public.votos v where v.opcao_id=op.id) else null end votos
  from public.enquete_opcoes op where op.enquete_id=p_id
 ) o);
end $$;

-- Personal counters and public city counters have explicit, different scopes.
-- Never disclose other users' pending requests or their author identifiers.
create function private.painel_impactos() returns jsonb
language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 return jsonb_build_object(
 'minhas',jsonb_build_object(
  'counts',(select jsonb_build_object('solicitada',count(*) filter(where status='solicitada'),'em_andamento',count(*) filter(where status='em_andamento'),'concluida',count(*) filter(where status='concluida')) from public.solicitacoes_melhoria where usuario_id=auth.uid()),
  'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.criado_em desc,r.id desc),'[]'::jsonb) from (
   select id,titulo,descricao,status,criado_em,true propria from public.solicitacoes_melhoria where usuario_id=auth.uid() and status<>'retirado' order by criado_em desc,id desc limit 20
  ) r)),
 'cidade',jsonb_build_object(
  'counts',(select jsonb_build_object('em_andamento',count(*) filter(where status='em_andamento'),'concluida',count(*) filter(where status='concluida')) from public.solicitacoes_melhoria where status in ('em_andamento','concluida')),
  'rows',(select coalesce(jsonb_agg(to_jsonb(r) order by r.criado_em desc,r.id desc),'[]'::jsonb) from (
   select id,titulo,descricao,status,criado_em,usuario_id=auth.uid() propria from public.solicitacoes_melhoria where status in ('em_andamento','concluida') order by criado_em desc,id desc limit 20
  ) r)));
end $$;
create function public.painel_impactos() returns jsonb language sql stable security invoker set search_path='' as $$select private.painel_impactos()$$;
revoke all on function private.opcoes_enquete(uuid),private.painel_impactos(),public.painel_impactos() from public,anon,authenticated;
grant execute on function private.opcoes_enquete(uuid),private.painel_impactos(),public.painel_impactos() to authenticated;

create or replace function private.pagina_dados_privados(p_lista text,p_cursor jsonb,p_filtros jsonb) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare v_contexto jsonb:=private.contexto_pagina(p_lista,p_cursor,p_filtros);v_key text:=v_contexto->>'key';v_id text:=v_contexto->>'id';v_papel text:=private.meu_papel();v_autor uuid;
 v_busca text:='%'||left(coalesce(p_filtros->>'busca',''),100)||'%';v_status text:=coalesce(p_filtros->>'status','');v_tipo text:=p_filtros->>'tipo';v_registro text:=p_filtros->>'id';begin
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
 if p_lista='admin_relato' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.categoria,r.descricao,r.local_texto,r.lugar_id,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.relatos r where (r.local_texto ilike v_busca or r.descricao ilike v_busca) and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_melhoria' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.titulo,r.descricao,r.lugar_id,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.solicitacoes_melhoria r where (r.titulo ilike v_busca or r.descricao ilike v_busca) and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_avaliacao' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,l.nome titulo,r.comentario descricao,r.sentimento,r.status,r.criado_em,r.criado_em as _key,r.id as _id from public.avaliacoes r join public.lugares l on l.id=r.lugar_id where (l.nome ilike v_busca or r.comentario ilike v_busca) and (v_status='' or r.status=v_status) and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_perfil' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.nome titulo,r.criado_em,r.criado_em as _key,r.id as _id from public.perfis r where r.nome ilike v_busca and (r.criado_em,r.id) < (coalesce(v_key::timestamptz,'infinity'::timestamptz),coalesce(v_id::uuid,'ffffffff-ffff-ffff-ffff-ffffffffffff'::uuid)) order by r.criado_em desc,r.id desc limit 21) q);end if;
 if p_lista='admin_lugar' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select r.id,r.nome titulo,r.endereco descricao,r.categoria,r.categoria_app,r.criado_em,r.nome as _key,r.id as _id from public.lugares r where r.nome ilike v_busca and (r.nome,r.id) > (coalesce(v_key,''),coalesce(v_id,'')) order by r.nome,r.id limit 21) q);end if;
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
  v_rows:=(select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (select l.*,l.nome as _key,l.id as _id from public.lugares l where l.duplicado_de is null and not l.oculto_catalogo and translate(lower(l.nome||' '||l.endereco),'áàâãéêíóôõúüç','aaaaeeiooouuc') like '%'||translate(lower(left(coalesce(p_filtros->>'busca',''),100)),'áàâãéêíóôõúüç','aaaaeeiooouuc')||'%'
 and (v_categoria='all' or l.categoria_app=v_categoria or (l.categoria_app is null and case when v_categoria='other' then l.categoria is null or not(l.categoria=any(v_conhecidas)) else l.categoria=any(v_tags) end)) and (l.nome,l.id) > (coalesce(v_key,''),coalesce(v_id,'')) order by l.nome,l.id limit 21) q);
 elsif p_lista in ('enquetes','registros_relato','registros_melhoria','historico','admin_relato','admin_melhoria','admin_avaliacao','admin_perfil','admin_lugar') then v_rows:=private.pagina_dados_privados(p_lista,p_cursor,p_filtros);
 else raise exception 'Lista inválida' using errcode='22023';end if;
 return private.resultado_pagina(v_rows,v_contexto);
end $$;
create or replace function private.listar_enquetes(p_pagina integer,p_encerradas boolean) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Página inválida' using errcode='22023';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
 select e.id,e.pergunta,e.encerra_em,(select v.opcao_id from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid()) minha_opcao,
 e.encerra_em<=now() encerrada,(e.encerra_em<=now() or exists(select 1 from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid())) resultados_visiveis,private.opcoes_enquete(e.id) opcoes
 from public.enquetes e where e.publicado and (p_encerradas is null or (e.encerra_em<=now())=p_encerradas) order by e.criado_em desc,e.id limit 21 offset p_pagina*20) q);
end $$;

create or replace function public.versao_app() returns integer language sql immutable security invoker set search_path='' as $$select 7$$;
notify pgrst,'reload schema';
