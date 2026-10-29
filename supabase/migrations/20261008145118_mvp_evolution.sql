alter table public.catalogo_osm_cache add column parcial boolean not null default false;
alter table public.catalogo_osm_cache add column elementos_recebidos integer not null default 0 check(elementos_recebidos between 0 and 400);
-- Incremental MVP evolution. Existing identities and reviews remain intact.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;
create table private.papeis (
 usuario_id uuid primary key references auth.users(id) on delete cascade,
 papel text not null check (papel in ('moderador','admin')),
 criado_em timestamptz not null default now()
);
alter table private.papeis enable row level security;
revoke all on private.papeis from public,anon,authenticated;
create function private.meu_papel() returns text language sql stable security definer set search_path='' as $$
 select coalesce((select papel from private.papeis where usuario_id=(select auth.uid())),'usuario')
$$;
revoke all on function private.meu_papel() from public,anon,authenticated;
grant execute on function private.meu_papel() to authenticated;
create function public.meu_papel() returns text language sql stable security invoker set search_path='' as $$ select private.meu_papel() $$;
revoke all on function public.meu_papel() from public,anon,authenticated;
grant execute on function public.meu_papel() to authenticated;
alter table public.lugares add column categoria_app text check (categoria_app in ('parks','restaurants','cafes','markets','shops','health','education','sports','services','other'));
update public.lugares set categoria='park' where origem='manual' and categoria is null and nome ilike 'Praça%';
alter table public.relatos add column lugar_id text references public.lugares(id) on delete restrict;
alter table public.relatos add column atualizado_em timestamptz not null default now();
alter table public.solicitacoes_melhoria add column lugar_id text references public.lugares(id) on delete restrict;
alter table public.solicitacoes_melhoria add column atualizado_em timestamptz not null default now();
grant select(lugar_id,atualizado_em) on public.relatos,public.solicitacoes_melhoria to authenticated;
grant insert(lugar_id) on public.relatos,public.solicitacoes_melhoria to authenticated;
create index relatos_lugar_idx on public.relatos(lugar_id);
create index solicitacoes_lugar_idx on public.solicitacoes_melhoria(lugar_id);
create table public.favoritos (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 lugar_id text not null references public.lugares(id) on delete cascade,
 criado_em timestamptz not null default now(), primary key(usuario_id,lugar_id)
);
create index favoritos_lugar_idx on public.favoritos(lugar_id);
alter table public.favoritos enable row level security;
revoke all on public.favoritos from public,anon,authenticated;
grant select,insert,delete on public.favoritos to authenticated;
create policy favoritos_ler on public.favoritos for select to authenticated using(usuario_id=(select auth.uid()));
create policy favoritos_criar on public.favoritos for insert to authenticated with check(usuario_id=(select auth.uid()));
create policy favoritos_excluir on public.favoritos for delete to authenticated using(usuario_id=(select auth.uid()));
create table public.historico_status (
 id uuid primary key default gen_random_uuid(), tipo text not null check(tipo in ('relato','melhoria','avaliacao','lugar')),
 registro_id text not null, usuario_id uuid references auth.users(id) on delete set null,
 responsavel_id uuid references auth.users(id) on delete set null,
 anterior text not null, novo text not null, motivo text not null check(char_length(btrim(motivo)) between 5 and 500),
 criado_em timestamptz not null default now()
);
create index historico_usuario_data_idx on public.historico_status(usuario_id,criado_em desc);
create index historico_registro_idx on public.historico_status(tipo,registro_id,criado_em desc);
create index historico_responsavel_idx on public.historico_status(responsavel_id);
alter table public.historico_status enable row level security;
revoke all on public.historico_status from public,anon,authenticated;
grant select(id,tipo,registro_id,anterior,novo,motivo,criado_em) on public.historico_status to authenticated;
create policy historico_ler on public.historico_status for select to authenticated using(usuario_id=(select auth.uid()) or (select private.meu_papel()) in ('moderador','admin'));
create table public.notificacoes (
 id uuid primary key default gen_random_uuid(), usuario_id uuid not null references auth.users(id) on delete cascade,
 titulo text not null, mensagem text not null, tipo text not null check(tipo in ('relato','melhoria','avaliacao')),
 registro_id text not null, lida boolean not null default false, criado_em timestamptz not null default now()
);
create index notificacoes_usuario_data_idx on public.notificacoes(usuario_id,criado_em desc);
alter table public.notificacoes enable row level security;
revoke all on public.notificacoes from public,anon,authenticated;
grant select on public.notificacoes to authenticated;
grant update(lida) on public.notificacoes to authenticated;
create policy notificacoes_ler on public.notificacoes for select to authenticated using(usuario_id=(select auth.uid()));
create policy notificacoes_lida on public.notificacoes for update to authenticated using(usuario_id=(select auth.uid())) with check(usuario_id=(select auth.uid()));
-- Own-record RPCs do not grant read access to author identifiers on public feeds.
create function private.meus_registros(p_tipo text,p_pagina integer) returns jsonb language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sem sessão' using errcode='42501'; end if;
 if p_pagina is null or p_pagina<0 or p_pagina>10000 then raise exception 'Página inválida';end if;
 if p_tipo='relato' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,categoria,descricao,local_texto,lugar_id,status,criado_em,atualizado_em from public.relatos where usuario_id=auth.uid() order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='melhoria' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,titulo,descricao,lugar_id,status,criado_em,atualizado_em from public.solicitacoes_melhoria where usuario_id=auth.uid() order by criado_em desc,id limit 21 offset p_pagina*20) t);
 else raise exception 'Tipo inválido';end if;
end;$$;
revoke all on function private.meus_registros(text,integer) from public,anon,authenticated;
grant execute on function private.meus_registros(text,integer) to authenticated;
create function public.meus_registros(p_tipo text,p_pagina integer default 0) returns jsonb language sql security invoker set search_path='' as $$ select private.meus_registros(p_tipo,p_pagina) $$;
revoke all on function public.meus_registros(text,integer) from public,anon,authenticated;
grant execute on function public.meus_registros(text,integer) to authenticated;
-- Server-owned moderation with a locked row and an expected status prevents lost updates.
create function private.moderar(p_tipo text,p_id text,p_status text,p_motivo text,p_anterior text) returns void language plpgsql security definer set search_path='' as $$
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
 if v_anterior=p_status then raise exception 'Escolha um status diferente';end if;
 if p_tipo='relato' then update public.relatos set status=p_status,atualizado_em=now() where id=p_id::uuid;
 elsif p_tipo='melhoria' then update public.solicitacoes_melhoria set status=p_status,atualizado_em=now() where id=p_id::uuid;
 else update public.avaliacoes set status=p_status where id=p_id::uuid;end if;
 insert into public.historico_status(tipo,registro_id,usuario_id,responsavel_id,anterior,novo,motivo) values(p_tipo,p_id,v_usuario,auth.uid(),v_anterior,p_status,btrim(p_motivo));
 insert into public.notificacoes(usuario_id,titulo,mensagem,tipo,registro_id) values(v_usuario,'Atualização de '||p_tipo,'Novo status: '||p_status||'. Motivo: '||btrim(p_motivo),p_tipo,p_id);
end;$$;
revoke all on function private.moderar(text,text,text,text,text) from public,anon,authenticated;
grant execute on function private.moderar(text,text,text,text,text) to authenticated;
create function public.moderar(p_tipo text,p_id text,p_status text,p_motivo text,p_anterior text) returns void language sql security invoker set search_path='' as $$ select private.moderar(p_tipo,p_id,p_status,p_motivo,p_anterior) $$;
revoke all on function public.moderar(text,text,text,text,text) from public,anon,authenticated;
grant execute on function public.moderar(text,text,text,text,text) to authenticated;
create function private.admin_listar(p_tipo text,p_busca text,p_status text,p_pagina integer) returns jsonb language plpgsql security definer set search_path='' as $$
declare v_papel text:=private.meu_papel();v_busca text:='%'||left(coalesce(p_busca,''),100)||'%';
begin
 if auth.uid() is null or v_papel not in ('moderador','admin') then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_pagina is null or p_pagina<0 or p_pagina>10000 then raise exception 'Página inválida';end if;
 if p_tipo='relato' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,categoria,descricao,local_texto,status,criado_em from public.relatos where (local_texto ilike v_busca or descricao ilike v_busca) and (p_status='' or status=p_status) order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='melhoria' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,titulo,descricao,status,criado_em from public.solicitacoes_melhoria where (titulo ilike v_busca or descricao ilike v_busca) and (p_status='' or status=p_status) order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='avaliacao' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select a.id,l.nome titulo,a.comentario descricao,a.sentimento,a.status,a.criado_em from public.avaliacoes a join public.lugares l on l.id=a.lugar_id where (l.nome ilike v_busca or a.comentario ilike v_busca) and (p_status='' or a.status=p_status) order by a.criado_em desc,a.id limit 21 offset p_pagina*20) t);
 elsif p_tipo='perfil' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,nome titulo,criado_em from public.perfis where nome ilike v_busca order by criado_em desc,id limit 21 offset p_pagina*20) t);
 elsif p_tipo='lugar' and v_papel='admin' then return (select coalesce(jsonb_agg(to_jsonb(t)),'[]'::jsonb) from (select id,nome titulo,endereco descricao,categoria,categoria_app,criado_em from public.lugares where nome ilike v_busca order by nome,id limit 21 offset p_pagina*20) t);
 else raise exception 'Acesso negado' using errcode='42501';end if;
end;$$;
revoke all on function private.admin_listar(text,text,text,integer) from public,anon,authenticated;
grant execute on function private.admin_listar(text,text,text,integer) to authenticated;
create function public.admin_listar(p_tipo text,p_busca text default '',p_status text default '',p_pagina integer default 0) returns jsonb language sql security invoker set search_path='' as $$ select private.admin_listar(p_tipo,p_busca,p_status,p_pagina) $$;
revoke all on function public.admin_listar(text,text,text,integer) from public,anon,authenticated;
grant execute on function public.admin_listar(text,text,text,integer) to authenticated;
create function private.classificar_lugar(p_id text,p_categoria text,p_motivo text) returns void language plpgsql security definer set search_path='' as $$
declare v_anterior text;
begin
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Motivo inválido';end if;
 select coalesce(categoria_app,'automatica') into v_anterior from public.lugares where id=p_id for update;
 if not found then raise exception 'Lugar não encontrado';end if;
 update public.lugares set categoria_app=nullif(p_categoria,''),atualizado_em=now() where id=p_id;
 insert into public.historico_status(tipo,registro_id,responsavel_id,anterior,novo,motivo) values('lugar',p_id,auth.uid(),v_anterior,coalesce(nullif(p_categoria,''),'automatica'),btrim(p_motivo));
end;$$;
revoke all on function private.classificar_lugar(text,text,text) from public,anon,authenticated;
grant execute on function private.classificar_lugar(text,text,text) to authenticated;
create function public.classificar_lugar(p_id text,p_categoria text,p_motivo text) returns void language sql security invoker set search_path='' as $$ select private.classificar_lugar(p_id,p_categoria,p_motivo) $$;
revoke all on function public.classificar_lugar(text,text,text) from public,anon,authenticated;
grant execute on function public.classificar_lugar(text,text,text) to authenticated;
-- OSM reference is left untouched; corrections enter the existing moderation queue.
-- Search the imported catalog, not Overpass. Bounded pages, RLS and invoker rights.
create function public.buscar_lugares(p_busca text,p_categoria text,p_tags text[],p_conhecidas text[],p_pagina integer default 0)
returns setof public.lugares language plpgsql stable security invoker set search_path='' as $$
begin
 if p_pagina is null or p_pagina not between 0 and 10000 or coalesce(cardinality(p_tags),0)>100 or coalesce(cardinality(p_conhecidas),0)>100 then raise exception 'Busca inválida'; end if;
 if p_categoria not in ('all','parks','restaurants','cafes','markets','shops','health','education','sports','services','other') then raise exception 'Categoria inválida'; end if;
 return query select l.* from public.lugares l where
 translate(lower(l.nome||' '||l.endereco),'áàâãéêíóôõúüç','aaaaeeiooouuc') like '%'||translate(lower(left(coalesce(p_busca,''),100)),'áàâãéêíóôõúüç','aaaaeeiooouuc')||'%'
 and (p_categoria='all' or l.categoria_app=p_categoria or (l.categoria_app is null and
  case when p_categoria='other' then l.categoria is null or not(l.categoria=any(p_conhecidas)) else l.categoria=any(p_tags) end))
 order by l.nome,l.id limit 21 offset p_pagina*20;
end $$;
revoke all on function public.buscar_lugares(text,text,text[],text[],integer) from public,anon;
grant execute on function public.buscar_lugares(text,text,text[],text[],integer) to authenticated;
create function private.historico_registro(p_tipo text,p_id text,p_pagina integer) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_papel text:=private.meu_papel();v_autor uuid;
begin
 if auth.uid() is null or p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Consulta inválida' using errcode='42501';end if;
 if p_tipo='relato' then select usuario_id into v_autor from public.relatos where id=p_id::uuid;
 elsif p_tipo='melhoria' then select usuario_id into v_autor from public.solicitacoes_melhoria where id=p_id::uuid;
 elsif p_tipo='avaliacao' then select usuario_id into v_autor from public.avaliacoes where id=p_id::uuid;
 elsif p_tipo<>'lugar' then raise exception 'Tipo inválido';end if;
 if not(v_papel='admin' or (v_papel='moderador' and p_tipo in ('relato','melhoria')) or coalesce(v_autor=auth.uid(),false)) then raise exception 'Acesso negado' using errcode='42501';end if;
 return (select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) from (
 select h.id,h.anterior,h.novo,h.motivo,h.criado_em,case when v_papel in ('admin','moderador') then coalesce(p.nome,'Equipe de moderação') else 'Equipe de moderação' end responsavel
 from public.historico_status h left join public.perfis p on p.id=h.responsavel_id where h.tipo=p_tipo and h.registro_id=p_id order by h.criado_em desc,h.id limit 21 offset p_pagina*20) q);
end $$;
create function public.historico_registro(p_tipo text,p_id text,p_pagina integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.historico_registro(p_tipo,p_id,p_pagina)$$;
revoke all on function private.historico_registro(text,text,integer),public.historico_registro(text,text,integer) from public,anon;
grant execute on function private.historico_registro(text,text,integer),public.historico_registro(text,text,integer) to authenticated;
alter policy historico_ler on public.historico_status using(usuario_id=(select auth.uid()) or (select private.meu_papel())='admin' or ((select private.meu_papel())='moderador' and tipo in ('relato','melhoria')));
