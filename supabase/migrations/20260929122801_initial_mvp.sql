-- MVP: data stays private to its author. No public safety score or comments yet.
create table public.perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null check (char_length(btrim(nome)) between 1 and 100),
  avatar_url text check (avatar_url is null or avatar_url like 'https://%'),
  criado_em timestamptz not null default now()
);
create table public.lugares (
  id text primary key,
  nome text not null check (char_length(btrim(nome)) between 1 and 150),
  endereco text not null,
  latitude double precision not null check (latitude between -90 and 90),
  longitude double precision not null check (longitude between -180 and 180),
  foto_url text check (foto_url is null or foto_url like 'https://%'),
  criado_em timestamptz not null default now()
);
create table public.fatores (
  id text primary key,
  nome text not null unique,
  ordem smallint not null unique
);
create table public.avaliacoes (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  lugar_id text not null references public.lugares(id) on delete restrict,
  sentimento text not null check (sentimento in ('Segura', 'Moderada', 'Atenção', 'Cuidado')),
  comentario text not null default '' check (char_length(comentario) <= 1000),
  status text not null default 'pendente' check (status in ('pendente','aprovada','rejeitada')),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  unique (usuario_id, lugar_id)
);
create index avaliacoes_lugar_idx on public.avaliacoes(lugar_id);
create index avaliacoes_usuario_data_idx on public.avaliacoes(usuario_id, atualizado_em desc);
create table public.avaliacao_fatores (
  avaliacao_id uuid not null references public.avaliacoes(id) on delete cascade,
  fator_id text not null references public.fatores(id) on delete restrict,
  primary key (avaliacao_id, fator_id)
);
create index avaliacao_fatores_fator_idx on public.avaliacao_fatores(fator_id);
alter table public.perfis enable row level security;
alter table public.lugares enable row level security;
alter table public.fatores enable row level security;
alter table public.avaliacoes enable row level security;
alter table public.avaliacao_fatores enable row level security;
revoke all on public.perfis, public.lugares, public.fatores, public.avaliacoes, public.avaliacao_fatores from public, anon, authenticated;
grant select on public.lugares, public.fatores to authenticated;
grant select, delete on public.avaliacoes, public.avaliacao_fatores to authenticated;
grant select on public.perfis to authenticated;
grant insert (id, nome), update (nome, avatar_url) on public.perfis to authenticated;
grant insert (usuario_id, lugar_id, sentimento, comentario), update (sentimento, comentario) on public.avaliacoes to authenticated;
grant insert (avaliacao_id, fator_id) on public.avaliacao_fatores to authenticated;
create policy perfil_ler on public.perfis for select to authenticated using (id = (select auth.uid()));
create policy perfil_criar on public.perfis for insert to authenticated with check (id = (select auth.uid()));
create policy perfil_editar on public.perfis for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));
create policy lugares_ler on public.lugares for select to authenticated using (true);
create policy fatores_ler on public.fatores for select to authenticated using (true);
create policy avaliacao_ler on public.avaliacoes for select to authenticated using (usuario_id = (select auth.uid()));
create policy avaliacao_criar on public.avaliacoes for insert to authenticated with check (usuario_id = (select auth.uid()));
create policy avaliacao_editar on public.avaliacoes for update to authenticated using (usuario_id = (select auth.uid())) with check (usuario_id = (select auth.uid()));
create policy avaliacao_excluir on public.avaliacoes for delete to authenticated using (usuario_id = (select auth.uid()));
create policy vinculo_ler on public.avaliacao_fatores for select to authenticated using (exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and a.usuario_id = (select auth.uid())));
create policy vinculo_criar on public.avaliacao_fatores for insert to authenticated with check (exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and a.usuario_id = (select auth.uid())));
create policy vinculo_excluir on public.avaliacao_fatores for delete to authenticated using (exists (select 1 from public.avaliacoes a where a.id = avaliacao_id and a.usuario_id = (select auth.uid())));
-- This invoker trigger changes NEW only; it cannot read privileged tables.
create function public.revisar_avaliacao() returns trigger language plpgsql security invoker set search_path = '' as $$
begin
  new.atualizado_em := now();
  if current_user = 'authenticated' or new.sentimento is distinct from old.sentimento or new.comentario is distinct from old.comentario then
    new.status := 'pendente';
  end if;
  return new;
end;
$$;
revoke all on function public.revisar_avaliacao() from public, anon, authenticated;
create trigger revisar_avaliacao before update on public.avaliacoes for each row execute function public.revisar_avaliacao();
-- One transaction for the review and its factors, with caller privileges + RLS.
create function public.salvar_avaliacao(p_lugar text, p_sentimento text, p_comentario text, p_fatores text[])
returns uuid language plpgsql security invoker set search_path = '' as $$
declare v_id uuid; v_usuario uuid := auth.uid();
begin
  if v_usuario is null then raise exception 'Login obrigatório' using errcode = '42501'; end if;
  if p_fatores is null or cardinality(p_fatores) not between 1 and 6 then
    raise exception 'Escolha entre um e seis fatores' using errcode = '22023';
  end if;
  if exists (select 1 from unnest(p_fatores) f where f is null or not exists (select 1 from public.fatores c where c.id = f)) then
    raise exception 'Fator inválido' using errcode = '22023';
  end if;
  insert into public.avaliacoes (usuario_id, lugar_id, sentimento, comentario)
  values (v_usuario, p_lugar, p_sentimento, coalesce(p_comentario, ''))
  on conflict (usuario_id, lugar_id) do update set sentimento = excluded.sentimento, comentario = excluded.comentario
  returning id into v_id;
  delete from public.avaliacao_fatores where avaliacao_id = v_id;
  insert into public.avaliacao_fatores (avaliacao_id, fator_id) select v_id, f from (select distinct unnest(p_fatores) f) chosen;
  return v_id;
end;
$$;
revoke all on function public.salvar_avaliacao(text,text,text,text[]) from public, anon, authenticated;
grant execute on function public.salvar_avaliacao(text,text,text,text[]) to authenticated;
insert into public.fatores(id,nome,ordem) values
('iluminacao','Iluminação',1),('movimento','Movimento de pessoas',2),('acessibilidade','Acessibilidade',3),
('assedio','Assédio ou Importunação',4),('limpeza','Limpeza/Conservação',5),('outro','Outro',6);
