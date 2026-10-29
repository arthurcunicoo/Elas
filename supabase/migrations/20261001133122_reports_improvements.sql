-- Relatos são privados enquanto aguardam revisão; outros usuários veem apenas verificados.
create table public.relatos (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  categoria text not null check (categoria in ('Iluminação','Movimento de pessoas','Acessibilidade','Assédio ou Importunação','Limpeza/Conservação','Outro')),
  descricao text not null check (char_length(btrim(descricao)) between 10 and 1000),
  local_texto text not null check (char_length(btrim(local_texto)) between 1 and 120),
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  status text not null default 'pendente' check (status in ('pendente','verificado','resolvido')),
  criado_em timestamptz not null default now(),
  constraint coordenadas_pares check ((latitude is null) = (longitude is null))
);
create index relatos_status_data_idx on public.relatos(status, criado_em desc);
create index relatos_usuario_data_idx on public.relatos(usuario_id, criado_em desc);
alter table public.relatos enable row level security;
revoke all on public.relatos from public, anon, authenticated;
grant select(id,categoria,descricao,local_texto,latitude,longitude,status,criado_em) on public.relatos to authenticated;
grant insert(usuario_id,categoria,descricao,local_texto,latitude,longitude) on public.relatos to authenticated;
create policy relatos_ler on public.relatos for select to authenticated
  using (usuario_id = (select auth.uid()) or status in ('verificado','resolvido'));
create policy relatos_criar on public.relatos for insert to authenticated
  with check (usuario_id = (select auth.uid()) and status = 'pendente');

-- Pedidos novos ficam visíveis apenas ao autor até serem postos em andamento.
create table public.solicitacoes_melhoria (
  id uuid primary key default gen_random_uuid(),
  usuario_id uuid not null references auth.users(id) on delete cascade,
  titulo text not null check (char_length(btrim(titulo)) between 1 and 100),
  descricao text not null check (char_length(btrim(descricao)) between 5 and 1000),
  status text not null default 'solicitada' check (status in ('solicitada','em_andamento','concluida')),
  criado_em timestamptz not null default now()
);
create index solicitacoes_status_data_idx on public.solicitacoes_melhoria(status, criado_em desc);
create index solicitacoes_usuario_data_idx on public.solicitacoes_melhoria(usuario_id, criado_em desc);
alter table public.solicitacoes_melhoria enable row level security;
revoke all on public.solicitacoes_melhoria from public, anon, authenticated;
grant select(id,titulo,descricao,status,criado_em) on public.solicitacoes_melhoria to authenticated;
grant insert(usuario_id,titulo,descricao) on public.solicitacoes_melhoria to authenticated;
create policy solicitacoes_ler on public.solicitacoes_melhoria for select to authenticated
  using (usuario_id = (select auth.uid()) or status in ('em_andamento','concluida'));
create policy solicitacoes_criar on public.solicitacoes_melhoria for insert to authenticated
  with check (usuario_id = (select auth.uid()) and status = 'solicitada');
