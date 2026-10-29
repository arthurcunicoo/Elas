-- Published civic activities. No demonstration records are inserted.
create table public.eventos (
 id uuid primary key default gen_random_uuid(), titulo text not null check(char_length(btrim(titulo)) between 3 and 100),
 descricao text not null check(char_length(btrim(descricao)) between 5 and 2000), local_texto text not null check(char_length(btrim(local_texto)) between 2 and 150),
 inicia_em timestamptz not null, publicado boolean not null default false, criado_em timestamptz not null default now()
);
create table public.inscricoes (
 usuario_id uuid not null references auth.users(id) on delete cascade, evento_id uuid not null references public.eventos(id) on delete cascade,
 criado_em timestamptz not null default now(), primary key(usuario_id,evento_id)
);
create table public.enquetes (
 id uuid primary key default gen_random_uuid(), pergunta text not null check(char_length(btrim(pergunta)) between 5 and 200),
 encerra_em timestamptz not null, publicado boolean not null default false, criado_em timestamptz not null default now()
);
create table public.enquete_opcoes (
 id uuid primary key default gen_random_uuid(), enquete_id uuid not null references public.enquetes(id) on delete cascade,
 texto text not null check(char_length(btrim(texto)) between 1 and 120), ordem integer not null check(ordem between 0 and 9),
 unique(enquete_id,id), unique(enquete_id,ordem)
);
create table public.votos (
 usuario_id uuid not null references auth.users(id) on delete cascade, enquete_id uuid not null references public.enquetes(id) on delete cascade,
 opcao_id uuid not null, criado_em timestamptz not null default now(), primary key(usuario_id,enquete_id),
 foreign key(enquete_id,opcao_id) references public.enquete_opcoes(enquete_id,id) on delete cascade
);
create index inscricoes_evento_idx on public.inscricoes(evento_id);
create index votos_opcao_idx on public.votos(enquete_id,opcao_id);
create index eventos_publicados_idx on public.eventos(inicia_em,id) where publicado;
create index enquetes_publicadas_idx on public.enquetes(criado_em desc,id) where publicado;
alter table public.eventos enable row level security;
alter table public.inscricoes enable row level security;
alter table public.enquetes enable row level security;
alter table public.enquete_opcoes enable row level security;
alter table public.votos enable row level security;
revoke all on public.eventos,public.inscricoes,public.enquetes,public.enquete_opcoes,public.votos from anon,authenticated;
grant select on public.eventos,public.enquetes,public.enquete_opcoes,public.inscricoes,public.votos to authenticated;
create policy eventos_leitura on public.eventos for select to authenticated using(publicado or (select private.meu_papel())='admin');
create policy enquetes_leitura on public.enquetes for select to authenticated using(publicado or (select private.meu_papel())='admin');
create policy opcoes_leitura on public.enquete_opcoes for select to authenticated using(exists(select 1 from public.enquetes e where e.id=enquete_id));
create policy inscricoes_leitura on public.inscricoes for select to authenticated using(usuario_id=(select auth.uid()));
create policy votos_leitura on public.votos for select to authenticated using(usuario_id=(select auth.uid()));

create function private.inscrever(p_evento uuid,p_participar boolean) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
 if p_participar then
  perform 1 from public.eventos where id=p_evento and publicado and inicia_em>now() for share;
  if not found then raise exception 'Evento encerrado ou indisponível'; end if;
  insert into public.inscricoes(usuario_id,evento_id) values(auth.uid(),p_evento) on conflict do nothing;
 else delete from public.inscricoes where usuario_id=auth.uid() and evento_id=p_evento;
 end if;
end $$;
create function public.inscrever(p_evento uuid,p_participar boolean) returns void language sql security invoker set search_path='' as $$select private.inscrever(p_evento,p_participar)$$;

create function private.votar(p_enquete uuid,p_opcao uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
 perform 1 from public.enquetes where id=p_enquete and publicado and encerra_em>now() for share;
 if not found then raise exception 'Consulta encerrada ou indisponível'; end if;
 insert into public.votos(usuario_id,enquete_id,opcao_id) values(auth.uid(),p_enquete,p_opcao)
 on conflict(usuario_id,enquete_id) do update set opcao_id=excluded.opcao_id,criado_em=now();
end $$;
create function public.votar(p_enquete uuid,p_opcao uuid) returns void language sql security invoker set search_path='' as $$select private.votar(p_enquete,p_opcao)$$;

create function private.listar_enquetes(p_pagina integer default 0) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
 if p_pagina is null or p_pagina not between 0 and 10000 then raise exception 'Página inválida'; end if;
 select coalesce(jsonb_agg(to_jsonb(q)),'[]'::jsonb) into result from (
 select e.id,e.pergunta,e.encerra_em,(select v.opcao_id from public.votos v where v.enquete_id=e.id and v.usuario_id=auth.uid()) minha_opcao,
 (select coalesce(jsonb_agg(to_jsonb(o) order by o.ordem),'[]'::jsonb) from (
  select op.id,op.texto,op.ordem,(select count(*) from public.votos v where v.opcao_id=op.id) votos from public.enquete_opcoes op where op.enquete_id=e.id
 ) o) opcoes from public.enquetes e where e.publicado order by e.criado_em desc,e.id limit 21 offset p_pagina*20
 ) q; return result;
end $$;
create function public.listar_enquetes(p_pagina integer default 0) returns jsonb language sql security invoker set search_path='' as $$select private.listar_enquetes(p_pagina)$$;

create function private.publicar_evento(p_titulo text,p_descricao text,p_local text,p_inicio timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if private.meu_papel()<>'admin' then raise exception 'Acesso restrito' using errcode='42501'; end if;
 if p_inicio<=now() then raise exception 'Informe uma data futura'; end if;
 insert into public.eventos(titulo,descricao,local_texto,inicia_em,publicado) values(btrim(p_titulo),btrim(p_descricao),btrim(p_local),p_inicio,true) returning id into result;
 return result;
end $$;
create function public.publicar_evento(p_titulo text,p_descricao text,p_local text,p_inicio timestamptz) returns uuid language sql security invoker set search_path='' as $$select private.publicar_evento(p_titulo,p_descricao,p_local,p_inicio)$$;

create function private.publicar_enquete(p_pergunta text,p_opcoes text[],p_fim timestamptz) returns uuid language plpgsql security definer set search_path='' as $$
declare result uuid; item text; pos integer:=0;
begin
 if private.meu_papel()<>'admin' then raise exception 'Acesso restrito' using errcode='42501'; end if;
 if p_fim<=now() or coalesce(cardinality(p_opcoes),0) not between 2 and 6 then raise exception 'Informe data futura e de 2 a 6 opções'; end if;
 if (select count(distinct btrim(x)) from unnest(p_opcoes) x)<>cardinality(p_opcoes) then raise exception 'Opções precisam ser diferentes'; end if;
 insert into public.enquetes(pergunta,encerra_em,publicado) values(btrim(p_pergunta),p_fim,true) returning id into result;
 foreach item in array p_opcoes loop
  insert into public.enquete_opcoes(enquete_id,texto,ordem) values(result,btrim(item),pos); pos:=pos+1;
 end loop; return result;
end $$;
create function public.publicar_enquete(p_pergunta text,p_opcoes text[],p_fim timestamptz) returns uuid language sql security invoker set search_path='' as $$select private.publicar_enquete(p_pergunta,p_opcoes,p_fim)$$;

create function private.admin_resumo() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if private.meu_papel() not in ('moderador','admin') then raise exception 'Acesso restrito' using errcode='42501'; end if;
 return jsonb_build_object('relatos_pendentes',(select count(*) from public.relatos where status='pendente'),
 'melhorias_solicitadas',(select count(*) from public.solicitacoes_melhoria where status='solicitada')) ||
 case when private.meu_papel()='admin' then jsonb_build_object('perfis',(select count(*) from public.perfis),'lugares',(select count(*) from public.lugares),
 'avaliacoes',(select count(*) from public.avaliacoes),'eventos',(select count(*) from public.eventos),'enquetes',(select count(*) from public.enquetes)) else '{}'::jsonb end;
end $$;
create function public.admin_resumo() returns jsonb language sql security invoker set search_path='' as $$select private.admin_resumo()$$;
revoke all on function private.inscrever(uuid,boolean),public.inscrever(uuid,boolean),private.votar(uuid,uuid),public.votar(uuid,uuid),
 private.listar_enquetes(integer),public.listar_enquetes(integer),private.publicar_evento(text,text,text,timestamptz),public.publicar_evento(text,text,text,timestamptz),
 private.publicar_enquete(text,text[],timestamptz),public.publicar_enquete(text,text[],timestamptz),private.admin_resumo(),public.admin_resumo() from public,anon;
grant execute on function private.inscrever(uuid,boolean),public.inscrever(uuid,boolean),private.votar(uuid,uuid),public.votar(uuid,uuid),
 private.listar_enquetes(integer),public.listar_enquetes(integer),private.publicar_evento(text,text,text,timestamptz),public.publicar_evento(text,text,text,timestamptz),
 private.publicar_enquete(text,text[],timestamptz),public.publicar_enquete(text,text[],timestamptz),private.admin_resumo(),public.admin_resumo() to authenticated;
create function private.minha_participacao() returns jsonb language plpgsql stable security definer set search_path='' as $$
begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501'; end if;
 return jsonb_build_object('avaliacoes',(select count(*) from public.avaliacoes where usuario_id=auth.uid()),'relatos',(select count(*) from public.relatos where usuario_id=auth.uid()),
 'melhorias',(select count(*) from public.solicitacoes_melhoria where usuario_id=auth.uid()),'inscricoes',(select count(*) from public.inscricoes where usuario_id=auth.uid()));
end $$;
create function public.minha_participacao() returns jsonb language sql security invoker set search_path='' as $$select private.minha_participacao()$$;
revoke all on function private.minha_participacao(),public.minha_participacao() from public,anon;
grant execute on function private.minha_participacao(),public.minha_participacao() to authenticated;
