-- Explicitly fictional showcase content. No real participation or safety data.
create table public.conteudos_demonstracao (
 id text primary key check (id like 'demo:%'),
 tipo text not null check (tipo in ('evento','impacto','avaliacao')),
 titulo text not null check (char_length(btrim(titulo)) between 3 and 100),
 descricao text not null check (char_length(btrim(descricao)) between 5 and 1000),
 lugar_id text references public.lugares(id) on delete cascade,
 local_texto text not null default '',
 inicia_em timestamptz,
 estado text check (estado in ('solicitada','em_andamento','concluida')),
 sentimento text check (sentimento in ('Segura','Moderada','Atenção','Cuidado')),
 nome_exibicao text not null default 'Perfil de demonstração',
 ordem smallint not null default 0,
 ativo boolean not null default true,
 ficticio boolean not null default true check (ficticio),
 criado_em timestamptz not null default now(),
 check (tipo <> 'evento' or inicia_em is not null),
 check (tipo <> 'impacto' or estado is not null),
 check (tipo <> 'avaliacao' or (lugar_id is not null and sentimento is not null))
);
create index conteudos_demo_tipo_idx on public.conteudos_demonstracao(tipo,ordem,id) where ativo;
create index conteudos_demo_lugar_idx on public.conteudos_demonstracao(lugar_id,tipo) where ativo;
alter table public.conteudos_demonstracao enable row level security;
revoke all on public.conteudos_demonstracao from public,anon,authenticated;
grant select on public.conteudos_demonstracao to authenticated;
grant all on public.conteudos_demonstracao to service_role;
create policy conteudos_demo_ler on public.conteudos_demonstracao for select to authenticated
 using (ativo and ficticio and (select auth.uid()) is not null);
