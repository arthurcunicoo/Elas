alter table public.lugares add column cadastro_revisao integer not null default 0;
-- Incremental changes; preserve all existing IDs, accounts and participation.
alter table public.relatos drop constraint relatos_status_check;
alter table public.relatos add constraint relatos_status_check check(status in ('pendente','verificado','resolvido','retirado'));
alter table public.solicitacoes_melhoria drop constraint solicitacoes_melhoria_status_check;
alter table public.solicitacoes_melhoria add constraint solicitacoes_melhoria_status_check check(status in ('solicitada','em_andamento','concluida','retirado'));
-- Idempotency stores the immutable request separately from editable content.
create table private.envios (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 chave uuid not null, tipo text not null check(tipo in ('relato','melhoria')),
 dados jsonb not null, criado_em timestamptz not null default now(), primary key(usuario_id,chave)
);
alter table private.envios enable row level security;
revoke all on private.envios from public,anon,authenticated;
create function private.enviar_registro(p_tipo text,p_chave uuid,p_dados jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare old private.envios; v_id uuid;begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_tipo is null or p_tipo not in ('relato','melhoria') or p_chave is null or jsonb_typeof(p_dados) is distinct from 'object' then raise exception 'Envio inválido' using errcode='22023';end if;
 insert into private.envios(usuario_id,chave,tipo,dados) values(auth.uid(),p_chave,p_tipo,p_dados) on conflict do nothing returning chave into v_id;
 if v_id is null then
  select * into old from private.envios where usuario_id=auth.uid() and chave=p_chave;
  if old.tipo is distinct from p_tipo or old.dados is distinct from p_dados then raise exception 'Esta tentativa já foi usada com outro conteúdo' using errcode='22023';end if;
  return p_chave;
 end if;
 if p_tipo='relato' then
  insert into public.relatos(id,usuario_id,categoria,descricao,local_texto,lugar_id,latitude,longitude)
  values(p_chave,auth.uid(),p_dados->>'categoria',btrim(p_dados->>'descricao'),btrim(p_dados->>'local_texto'),p_dados->>'lugar_id',(p_dados->>'latitude')::float8,(p_dados->>'longitude')::float8);
 else
  insert into public.solicitacoes_melhoria(id,usuario_id,titulo,descricao,lugar_id)
  values(p_chave,auth.uid(),btrim(p_dados->>'titulo'),btrim(p_dados->>'descricao'),p_dados->>'lugar_id');
 end if;
 return p_chave;
end $$;
create function public.enviar_registro(p_tipo text,p_chave uuid,p_dados jsonb) returns uuid language sql security invoker set search_path='' as $$select private.enviar_registro(p_tipo,p_chave,p_dados)$$;
revoke all on function private.enviar_registro(text,uuid,jsonb),public.enviar_registro(text,uuid,jsonb) from public,anon;
grant execute on function private.enviar_registro(text,uuid,jsonb),public.enviar_registro(text,uuid,jsonb) to authenticated;

create function private.detalhes_registro(p_tipo text,p_id uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_tipo='relato' then return (select to_jsonb(t) from (select id,categoria,descricao,local_texto,lugar_id,latitude,longitude,status,criado_em,atualizado_em,usuario_id=auth.uid() proprio from public.relatos where id=p_id and (usuario_id=auth.uid() or status in ('verificado','resolvido'))) t);
 elsif p_tipo='melhoria' then return (select to_jsonb(t) from (select id,titulo,descricao,lugar_id,status,criado_em,atualizado_em,usuario_id=auth.uid() proprio from public.solicitacoes_melhoria where id=p_id and (usuario_id=auth.uid() or status in ('em_andamento','concluida'))) t);
 elsif p_tipo='avaliacao' then return (select to_jsonb(t) from (select a.id,l.nome titulo,a.comentario descricao,a.lugar_id,a.sentimento,a.status,a.criado_em,a.atualizado_em,true proprio from public.avaliacoes a join public.lugares l on l.id=a.lugar_id where a.id=p_id and a.usuario_id=auth.uid()) t);
 else raise exception 'Tipo inválido' using errcode='22023';end if;
end $$;
create function public.detalhes_registro(p_tipo text,p_id uuid) returns jsonb language sql security invoker set search_path='' as $$select private.detalhes_registro(p_tipo,p_id)$$;
revoke all on function private.detalhes_registro(text,uuid),public.detalhes_registro(text,uuid) from public,anon;
grant execute on function private.detalhes_registro(text,uuid),public.detalhes_registro(text,uuid) to authenticated;

create function private.alterar_registro_proprio(p_tipo text,p_id uuid,p_anterior timestamptz,p_dados jsonb,p_retirar boolean) returns void language plpgsql security definer set search_path='' as $$
declare dono uuid; state text; modified timestamptz; newstate text;begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_retirar is null then raise exception 'Operação inválida' using errcode='22023';end if;
 if p_tipo='relato' then select usuario_id,status,atualizado_em into dono,state,modified from public.relatos where id=p_id for update;
 elsif p_tipo='melhoria' then select usuario_id,status,atualizado_em into dono,state,modified from public.solicitacoes_melhoria where id=p_id for update;
 else raise exception 'Tipo inválido' using errcode='22023';end if;
 if dono is distinct from auth.uid() then raise exception 'Registro indisponível' using errcode='42501';end if;
 if modified is distinct from p_anterior then raise exception 'O registro mudou. Atualize antes de continuar.' using errcode='40001';end if;
 if state not in ('pendente','solicitada') then raise exception 'Só registros aguardando análise podem ser corrigidos ou retirados' using errcode='22023';end if;
 newstate:=case when p_retirar then 'retirado' else state end;
 if p_tipo='relato' then update public.relatos set descricao=case when p_retirar then descricao else btrim(p_dados->>'descricao') end,status=newstate,atualizado_em=clock_timestamp() where id=p_id;
 else update public.solicitacoes_melhoria set titulo=case when p_retirar then titulo else btrim(p_dados->>'titulo') end,descricao=case when p_retirar then descricao else btrim(p_dados->>'descricao') end,status=newstate,atualizado_em=clock_timestamp() where id=p_id;end if;
 insert into public.historico_status(tipo,registro_id,usuario_id,responsavel_id,anterior,novo,motivo) values(p_tipo,p_id::text,auth.uid(),auth.uid(),state,newstate,case when p_retirar then 'Registro retirado pelo autor' else 'Texto corrigido pelo autor antes da análise' end);
end $$;
create function public.alterar_registro_proprio(p_tipo text,p_id uuid,p_anterior timestamptz,p_dados jsonb,p_retirar boolean default false) returns void language sql security invoker set search_path='' as $$select private.alterar_registro_proprio(p_tipo,p_id,p_anterior,p_dados,p_retirar)$$;
revoke all on function private.alterar_registro_proprio(text,uuid,timestamptz,jsonb,boolean),public.alterar_registro_proprio(text,uuid,timestamptz,jsonb,boolean) from public,anon;
grant execute on function private.alterar_registro_proprio(text,uuid,timestamptz,jsonb,boolean),public.alterar_registro_proprio(text,uuid,timestamptz,jsonb,boolean) to authenticated;

-- Replace classification API instead of leaving an unprotected stale-write overload.
drop function public.classificar_lugar(text,text,text);
drop function private.classificar_lugar(text,text,text);
create function private.classificar_lugar(p_id text,p_categoria text,p_motivo text,p_anterior text) returns void language plpgsql security definer set search_path='' as $$
declare old text;begin
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Motivo inválido' using errcode='22023';end if;
 select coalesce(categoria_app,'') into old from public.lugares where id=p_id for update;
 if not found then raise exception 'Lugar não encontrado' using errcode='22023';end if;
 if old is distinct from p_anterior then raise exception 'A classificação mudou. Atualize a lista.' using errcode='40001';end if;
 if old is not distinct from p_categoria then raise exception 'Escolha uma categoria diferente' using errcode='22023';end if;
 update public.lugares set categoria_app=nullif(p_categoria,''),atualizado_em=clock_timestamp() where id=p_id;
 insert into public.historico_status(tipo,registro_id,responsavel_id,anterior,novo,motivo) values('lugar',p_id,auth.uid(),coalesce(nullif(old,''),'automatica'),coalesce(nullif(p_categoria,''),'automatica'),btrim(p_motivo));
end $$;
create function public.classificar_lugar(p_id text,p_categoria text,p_motivo text,p_anterior text) returns void language sql security invoker set search_path='' as $$select private.classificar_lugar(p_id,p_categoria,p_motivo,p_anterior)$$;
revoke all on function private.classificar_lugar(text,text,text,text),public.classificar_lugar(text,text,text,text) from public,anon;
grant execute on function private.classificar_lugar(text,text,text,text),public.classificar_lugar(text,text,text,text) to authenticated;

create function private.corrigir_lugar(p_id text,p_anterior timestamptz,p_nome text,p_endereco text,p_foto text,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare old public.lugares;begin
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso restrito' using errcode='42501';end if;
 if char_length(btrim(p_nome)) not between 1 and 120 or char_length(btrim(p_endereco)) not between 1 and 200 or p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 or (nullif(p_foto,'') is not null and p_foto !~ '^https://') then raise exception 'Dados inválidos' using errcode='22023';end if;
 select * into old from public.lugares where id=p_id for update;
 if not found then raise exception 'Lugar indisponível' using errcode='22023';end if;
 if old.atualizado_em is distinct from p_anterior then raise exception 'Lugar atualizado por outra pessoa' using errcode='40001';end if;
 update public.lugares set nome=btrim(p_nome),endereco=btrim(p_endereco),foto_url=nullif(btrim(p_foto),''),cadastro_revisao=cadastro_revisao+1,atualizado_em=clock_timestamp() where id=p_id;
 insert into public.historico_status(tipo,registro_id,responsavel_id,anterior,novo,motivo) values('lugar',p_id,auth.uid(),old.nome||' · '||old.endereco,btrim(p_nome)||' · '||btrim(p_endereco),btrim(p_motivo));
end $$;
create function public.corrigir_lugar(p_id text,p_anterior timestamptz,p_nome text,p_endereco text,p_foto text,p_motivo text) returns void language sql security invoker set search_path='' as $$select private.corrigir_lugar(p_id,p_anterior,p_nome,p_endereco,p_foto,p_motivo)$$;
revoke all on function private.corrigir_lugar(text,timestamptz,text,text,text,text),public.corrigir_lugar(text,timestamptz,text,text,text,text) from public,anon;
grant execute on function private.corrigir_lugar(text,timestamptz,text,text,text,text),public.corrigir_lugar(text,timestamptz,text,text,text,text) to authenticated;

alter table public.eventos add column atualizado_em timestamptz not null default now(),add column cancelado boolean not null default false;
alter table public.enquetes add column atualizado_em timestamptz not null default now();
create table private.publicacoes_historico (
 id uuid primary key default gen_random_uuid(),tipo text not null,registro_id uuid not null,anterior jsonb not null,novo jsonb not null,
 responsavel_id uuid references auth.users(id) on delete set null,criado_em timestamptz not null default now()
);
alter table private.publicacoes_historico enable row level security;
revoke all on private.publicacoes_historico from public,anon,authenticated;
create function private.gerenciar_publicacao(p_tipo text,p_id uuid,p_anterior timestamptz,p_acao text,p_dados jsonb) returns void language plpgsql security definer set search_path='' as $$
declare e public.eventos;q public.enquetes;newrow jsonb;begin
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso restrito' using errcode='42501';end if;
 if p_tipo='evento' then
  select * into e from public.eventos where id=p_id for update;
  if not found then raise exception 'Evento indisponível' using errcode='22023';end if;
  if e.atualizado_em is distinct from p_anterior then raise exception 'Evento atualizado por outra pessoa' using errcode='40001';end if;
  if p_acao='editar' then
   if (p_dados->>'inicia_em')::timestamptz<=now() then raise exception 'Informe uma data futura' using errcode='22023';end if;
   update public.eventos set titulo=btrim(p_dados->>'titulo'),descricao=btrim(p_dados->>'descricao'),local_texto=btrim(p_dados->>'local_texto'),inicia_em=(p_dados->>'inicia_em')::timestamptz,atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='cancelar' then update public.eventos set cancelado=true,atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='ocultar' then update public.eventos set publicado=false,atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='publicar' then
   if e.cancelado or e.inicia_em<=now() then raise exception 'Evento cancelado ou encerrado' using errcode='22023';end if;
   update public.eventos set publicado=true,atualizado_em=clock_timestamp() where id=p_id;
  else raise exception 'Ação inválida' using errcode='22023';end if;
  select to_jsonb(t) into newrow from public.eventos t where id=p_id;
  insert into private.publicacoes_historico(tipo,registro_id,anterior,novo,responsavel_id) values(p_tipo,p_id,to_jsonb(e),newrow,auth.uid());
 elsif p_tipo='enquete' then
  select * into q from public.enquetes where id=p_id for update;
  if not found then raise exception 'Consulta indisponível' using errcode='22023';end if;
  if q.atualizado_em is distinct from p_anterior then raise exception 'Consulta atualizada por outra pessoa' using errcode='40001';end if;
  if p_acao='editar' then
   if exists(select 1 from public.votos where enquete_id=p_id) or q.encerra_em<=now() then raise exception 'Consulta votada ou encerrada: preserve a pergunta e as opções' using errcode='22023';end if;
   if (p_dados->>'encerra_em')::timestamptz<=now() then raise exception 'Informe uma data futura' using errcode='22023';end if;
   update public.enquetes set pergunta=btrim(p_dados->>'pergunta'),encerra_em=(p_dados->>'encerra_em')::timestamptz,atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='encerrar' then update public.enquetes set encerra_em=least(encerra_em,now()),atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='ocultar' then update public.enquetes set publicado=false,atualizado_em=clock_timestamp() where id=p_id;
  elsif p_acao='publicar' then
   if q.encerra_em<=now() then raise exception 'Consulta encerrada' using errcode='22023';end if;
   update public.enquetes set publicado=true,atualizado_em=clock_timestamp() where id=p_id;
  else raise exception 'Ação inválida' using errcode='22023';end if;
  select to_jsonb(t) into newrow from public.enquetes t where id=p_id;
  insert into private.publicacoes_historico(tipo,registro_id,anterior,novo,responsavel_id) values(p_tipo,p_id,to_jsonb(q),newrow,auth.uid());
 else raise exception 'Tipo inválido' using errcode='22023';end if;
end $$;
create function public.gerenciar_publicacao(p_tipo text,p_id uuid,p_anterior timestamptz,p_acao text,p_dados jsonb default '{}'::jsonb) returns void language sql security invoker set search_path='' as $$select private.gerenciar_publicacao(p_tipo,p_id,p_anterior,p_acao,p_dados)$$;
revoke all on function private.gerenciar_publicacao(text,uuid,timestamptz,text,jsonb),public.gerenciar_publicacao(text,uuid,timestamptz,text,jsonb) from public,anon;
grant execute on function private.gerenciar_publicacao(text,uuid,timestamptz,text,jsonb),public.gerenciar_publicacao(text,uuid,timestamptz,text,jsonb) to authenticated;
create or replace function private.inscrever(p_evento uuid,p_participar boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_participar then
  perform 1 from public.eventos where id=p_evento and publicado and not cancelado and inicia_em>now() for share;
  if not found then raise exception 'Evento cancelado, encerrado ou indisponível' using errcode='22023';end if;
  insert into public.inscricoes(usuario_id,evento_id) values(auth.uid(),p_evento) on conflict do nothing;
 else delete from public.inscricoes where usuario_id=auth.uid() and evento_id=p_evento;end if;
end $$;
-- Parameter replaces old overload, allowing filtering before pagination.
drop function public.listar_enquetes(integer);
drop function private.listar_enquetes(integer);
create function private.listar_enquetes(p_pagina integer,p_encerradas boolean) returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Página inválida' using errcode='22023';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
 select e.id,e.pergunta,e.encerra_em,(select v.opcao_id from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid()) minha_opcao,
 (select coalesce(jsonb_agg(to_jsonb(o) order by o.ordem),'[]'::jsonb) from (select op.id,op.texto,op.ordem,(select count(*) from public.votos v where v.opcao_id=op.id) votos from public.enquete_opcoes op where op.enquete_id=e.id) o) opcoes
 from public.enquetes e where e.publicado and (p_encerradas is null or (e.encerra_em<=now())=p_encerradas) order by e.criado_em desc,e.id limit 21 offset p_pagina*20) q);
end $$;
create function public.listar_enquetes(p_pagina integer default 0,p_encerradas boolean default null) returns jsonb language sql security invoker set search_path='' as $$select private.listar_enquetes(p_pagina,p_encerradas)$$;
revoke all on function private.listar_enquetes(integer,boolean),public.listar_enquetes(integer,boolean) from public,anon;
grant execute on function private.listar_enquetes(integer,boolean),public.listar_enquetes(integer,boolean) to authenticated;
-- A later Overpass refresh must not replace the human-reviewed display fields.
create function private.preservar_cadastro_revisado() returns trigger language plpgsql set search_path='' as $$
begin
 if old.cadastro_revisao>0 and new.cadastro_revisao=old.cadastro_revisao then
  new.nome:=old.nome;new.endereco:=old.endereco;new.foto_url:=old.foto_url;
 end if;return new;
end $$;
revoke all on function private.preservar_cadastro_revisado() from public,anon,authenticated;
create trigger preservar_cadastro_revisado before update on public.lugares for each row execute function private.preservar_cadastro_revisado();

create or replace function private.historico_registro(p_tipo text,p_id text,p_pagina integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_papel text:=private.meu_papel();v_autor uuid;
begin
 if auth.uid() is null or p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Consulta inválida' using errcode='42501';end if;
 if p_tipo='relato' then select usuario_id into v_autor from public.relatos where id=p_id::uuid;
 elsif p_tipo='melhoria' then select usuario_id into v_autor from public.solicitacoes_melhoria where id=p_id::uuid;
 elsif p_tipo='avaliacao' then select usuario_id into v_autor from public.avaliacoes where id=p_id::uuid;
 elsif p_tipo<>'lugar' then raise exception 'Tipo inválido';end if;
 if not(v_papel='admin' or (v_papel='moderador' and p_tipo in ('relato','melhoria')) or coalesce(v_autor=auth.uid(),false)) then raise exception 'Acesso negado' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
 select h.id,h.anterior,h.novo,h.motivo,h.criado_em,case when h.responsavel_id=auth.uid() then 'Você' when v_papel in ('admin','moderador') then coalesce(p.nome,'Equipe de moderação') else 'Equipe de moderação' end responsavel
 from public.historico_status h left join public.perfis p on p.id=h.responsavel_id where h.tipo=p_tipo and h.registro_id=p_id order by h.criado_em desc,h.id limit 21 offset p_pagina*20) q);
end $$;

create or replace function private.admin_listar(p_tipo text,p_busca text,p_status text,p_pagina integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_papel text:=private.meu_papel();v_busca text:='%'||left(coalesce(p_busca,''),100)||'%';
begin
 if auth.uid() is null or v_papel not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_pagina is null or p_pagina<0 or p_pagina>10000 then raise exception 'Página inválida';end if;
 if p_tipo='relato' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,categoria,descricao,local_texto,lugar_id,status,criado_em from public.relatos where (local_texto ilike v_busca or descricao ilike v_busca) and (p_status='' or status=p_status) order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='melhoria' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,titulo,descricao,lugar_id,status,criado_em from public.solicitacoes_melhoria where (titulo ilike v_busca or descricao ilike v_busca) and (p_status='' or status=p_status) order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='avaliacao' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select a.id,l.nome titulo,a.comentario descricao,a.sentimento,a.status,a.criado_em from public.avaliacoes a join public.lugares l on l.id=a.lugar_id where (l.nome ilike v_busca or a.comentario ilike v_busca) and (p_status='' or a.status=p_status) order by a.criado_em desc,a.id limit 21 offset p_pagina*20) t);
 elsif p_tipo='perfil' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,nome titulo,criado_em from public.perfis where nome ilike v_busca order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='lugar' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,nome titulo,endereco descricao,categoria,categoria_app,criado_em from public.lugares where nome ilike v_busca order by nome,id limit 21 offset p_pagina*20) t);
 else raise exception 'Acesso negado' using errcode='42501';end if;
end;$$;

create or replace function private.moderar(p_tipo text,p_id text,p_status text,p_motivo text,p_anterior text) returns void language plpgsql security definer set search_path='' as $$
declare v_usuario uuid;v_anterior text;v_papel text:=private.meu_papel();
begin
 if auth.uid() is null or v_papel not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Informe o motivo (5–500 caracteres)';end if;
 if p_tipo='relato' and p_status in ('pendente','verificado','resolvido') then
 select usuario_id,status into v_usuario,v_anterior from public.relatos where id=p_id::uuid for update;
 elsif p_tipo='melhoria' and p_status in ('solicitada','em_andamento','concluida') then
 select usuario_id,status into v_usuario,v_anterior from public.solicitacoes_melhoria where id=p_id::uuid for update;
 elsif p_tipo='avaliacao' and v_papel='admin' and p_status in ('pendente','aprovada','rejeitada') then
 select usuario_id,status into v_usuario,v_anterior from public.avaliacoes where id=p_id::uuid for update;
 else raise exception 'Operação inválida';end if;
 if v_usuario is null then raise exception 'Registro não encontrado';end if;
 if v_usuario=auth.uid() then raise exception 'Você não pode moderar o próprio conteúdo' using errcode='42501';end if;
 if p_anterior is null or v_anterior<>p_anterior then raise exception 'O registro mudou. Atualize a lista antes de continuar.' using errcode='40001';end if;
 if v_anterior='retirado' then raise exception 'O autor retirou este registro' using errcode='22023';end if;
 if v_anterior=p_status then raise exception 'Escolha um status diferente';end if;
 if p_tipo='relato' then update public.relatos set status=p_status,atualizado_em=now() where id=p_id::uuid;
 elsif p_tipo='melhoria' then update public.solicitacoes_melhoria set status=p_status,atualizado_em=now() where id=p_id::uuid;
 else update public.avaliacoes set status=p_status where id=p_id::uuid;end if;
 insert into public.historico_status(tipo,registro_id,usuario_id,responsavel_id,anterior,novo,motivo) values(p_tipo,p_id,v_usuario,auth.uid(),v_anterior,p_status,btrim(p_motivo));
 insert into public.notificacoes(usuario_id,titulo,mensagem,tipo,registro_id) values(v_usuario,'Atualização de '||p_tipo,'Novo status: '||p_status||'. Motivo: '||btrim(p_motivo),p_tipo,p_id);
end;$$;
