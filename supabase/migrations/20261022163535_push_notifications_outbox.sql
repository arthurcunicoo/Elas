-- Push is opt-in, targets existing personal inbox updates and starts disabled.
create table private.push_config (
 id boolean primary key default true check(id),ativo boolean not null default false,
 projeto_expo uuid,endpoint text,token_hash text
);
insert into private.push_config(id) values(true);
create table private.push_dispositivos (
 instalacao uuid primary key,usuario_id uuid not null references auth.users(id) on delete cascade,
 token text not null unique check(token ~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$'),
 plataforma text not null check(plataforma in ('android','ios')),ativo boolean not null default true,
 revisao integer not null default 0,visto_em timestamptz not null default now()
);
create index push_dispositivos_usuario on private.push_dispositivos(usuario_id);
create index push_dispositivos_expiracao on private.push_dispositivos(visto_em,instalacao);
create table private.push_fila (
 id uuid primary key default gen_random_uuid(),notificacao_id uuid not null references public.notificacoes(id) on delete cascade,
 instalacao uuid not null references private.push_dispositivos(instalacao) on delete cascade,
 usuario_id uuid not null references auth.users(id) on delete cascade,revisao integer not null,
 estado text not null default 'pendente' check(estado in ('pendente','enviando','recibo','concluida','falha','cancelada')),
 tentativas integer not null default 0,proxima_em timestamptz not null default now(),
 lease uuid,lease_ate timestamptz,ticket text,erro text,criado_em timestamptz not null default now(),
 unique(notificacao_id,instalacao)
);
create index push_fila_pendente on private.push_fila(proxima_em,id) where estado in ('pendente','enviando','recibo');
create index push_fila_notificacao on private.push_fila(notificacao_id);
create index push_fila_instalacao on private.push_fila(instalacao);
create index push_fila_usuario on private.push_fila(usuario_id);
create index push_fila_retencao on private.push_fila(criado_em,id);
alter table private.push_config enable row level security;
alter table private.push_dispositivos enable row level security;
alter table private.push_fila enable row level security;
revoke all on private.push_config,private.push_dispositivos,private.push_fila from public,anon,authenticated,service_role;

create function private.estado_push(p_instalacao uuid default null) returns jsonb
 language plpgsql stable security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 return jsonb_build_object('disponivel',coalesce((select ativo and projeto_expo is not null from private.push_config where id),false),
 'ativo',exists(select 1 from private.push_dispositivos where instalacao=p_instalacao and usuario_id=auth.uid() and ativo));
end $$;
create function public.estado_push(p_instalacao uuid default null) returns jsonb language sql stable security invoker set search_path='' as $$select private.estado_push(p_instalacao)$$;
create function private.registrar_push(p_instalacao uuid,p_token text,p_plataforma text,p_projeto uuid,p_usuario uuid) returns void
 language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 if p_usuario is distinct from auth.uid() then raise exception 'Sessão alterada' using errcode='42501';end if;
 if p_instalacao is null or p_token is null or p_plataforma is null or p_projeto is null or p_plataforma not in ('android','ios')
 or p_token !~ '^(ExponentPushToken|ExpoPushToken)\[[A-Za-z0-9_-]{10,200}\]$' then raise exception 'Dispositivo inválido' using errcode='22023';end if;
 if not exists(select 1 from private.push_config where id and ativo and projeto_expo=p_projeto) then raise exception 'Push indisponível' using errcode='22023';end if;
 insert into private.push_dispositivos(instalacao,usuario_id,token,plataforma) values(p_instalacao,auth.uid(),p_token,p_plataforma)
 on conflict(instalacao) do update set usuario_id=excluded.usuario_id,token=excluded.token,plataforma=excluded.plataforma,ativo=true,visto_em=now(),
 revisao=push_dispositivos.revisao+case when push_dispositivos.usuario_id<>excluded.usuario_id or push_dispositivos.token<>excluded.token or not push_dispositivos.ativo then 1 else 0 end;
end $$;
create function public.registrar_push(p_instalacao uuid,p_token text,p_plataforma text,p_projeto uuid,p_usuario uuid) returns void
 language sql security invoker set search_path='' as $$select private.registrar_push(p_instalacao,p_token,p_plataforma,p_projeto,p_usuario)$$;
create function private.desativar_push(p_instalacao uuid) returns void
 language plpgsql security definer set search_path='' as $$begin
 if auth.uid() is null then raise exception 'Sessão necessária' using errcode='42501';end if;
 update private.push_dispositivos set ativo=false,revisao=revisao+1 where instalacao=p_instalacao and usuario_id=auth.uid() and ativo;
 update private.push_fila set estado='cancelada',lease=null,lease_ate=null where instalacao=p_instalacao and usuario_id=auth.uid() and estado in ('pendente','enviando','recibo');
end $$;
create function public.desativar_push(p_instalacao uuid) returns void language sql security invoker set search_path='' as $$select private.desativar_push(p_instalacao)$$;
revoke all on function private.estado_push(uuid),public.estado_push(uuid),private.registrar_push(uuid,text,text,uuid,uuid),public.registrar_push(uuid,text,text,uuid,uuid),private.desativar_push(uuid),public.desativar_push(uuid) from public,anon;
grant execute on function private.estado_push(uuid),public.estado_push(uuid),private.registrar_push(uuid,text,text,uuid,uuid),public.registrar_push(uuid,text,text,uuid,uuid),private.desativar_push(uuid),public.desativar_push(uuid) to authenticated;
create function private.enfileirar_push() returns trigger language plpgsql security definer set search_path='' as $$begin
 if not new.lida and exists(select 1 from private.push_config where id and ativo) then
  insert into private.push_fila(notificacao_id,instalacao,usuario_id,revisao)
  select new.id,d.instalacao,new.usuario_id,d.revisao from private.push_dispositivos d
  where d.usuario_id=new.usuario_id and d.ativo and d.visto_em>now()-interval '60 days' on conflict do nothing;
 end if;return new;
end $$;
revoke all on function private.enfileirar_push() from public,anon,authenticated,service_role;
create trigger notificacao_push after insert on public.notificacoes for each row execute function private.enfileirar_push();

create function private.reservar_push(p_token_hash text) returns jsonb language plpgsql security definer set search_path='' as $$
declare result jsonb;begin
 if p_token_hash is null or not exists(select 1 from private.push_config where id and token_hash=p_token_hash) then raise exception 'Acesso negado' using errcode='42501';end if;
 if not exists(select 1 from private.push_config where id and ativo and projeto_expo is not null) then return '[]'::jsonb;end if;
 -- Cancellation and expiry are bounded too; maintenance handles any remaining backlog.
 with stale as (select q.id from private.push_fila q join private.push_dispositivos d on d.instalacao=q.instalacao
  join public.notificacoes n on n.id=q.notificacao_id where q.estado in ('pendente','enviando','recibo') and
  (q.criado_em<now()-interval '1 day' or n.lida or not d.ativo or d.usuario_id<>q.usuario_id or d.revisao<>q.revisao)
  order by q.proxima_em,q.id for update of q skip locked limit 500)
 update private.push_fila q set estado='cancelada',lease=null,lease_ate=null from stale s where q.id=s.id;
 with candidates as (select q.id from private.push_fila q join private.push_dispositivos d on d.instalacao=q.instalacao
  join public.notificacoes n on n.id=q.notificacao_id
  where q.estado in ('pendente','enviando','recibo') and q.proxima_em<=now() and (q.lease_ate is null or q.lease_ate<now())
  and q.criado_em>=now()-interval '1 day' and not n.lida and d.ativo and d.usuario_id=q.usuario_id and d.revisao=q.revisao
  and (q.ticket is not null or q.tentativas<5)
  order by q.proxima_em,q.id for update of q skip locked limit 50),
 reserved as (update private.push_fila q set lease=gen_random_uuid(),lease_ate=now()+interval '2 minutes',
  estado=case when ticket is null then 'enviando' else 'recibo' end,tentativas=tentativas+case when ticket is null then 1 else 0 end
  from candidates c where q.id=c.id returning q.*)
 select coalesce(jsonb_agg(jsonb_build_object('id',q.id,'lease',q.lease,'notificationId',q.notificacao_id,'token',d.token,'ticket',q.ticket)),'[]'::jsonb)
 into result from reserved q join private.push_dispositivos d on d.instalacao=q.instalacao;
 return result;
end $$;
create function public.reservar_push(p_token_hash text) returns jsonb language sql security invoker set search_path='' as $$select private.reservar_push(p_token_hash)$$;
create function private.finalizar_push(p_lease uuid,p_resultado text,p_ticket text default null) returns void language plpgsql security definer set search_path='' as $$
declare q private.push_fila;begin
 if p_resultado is null or p_resultado not in ('ticket','ok','retry','invalid','permanent','missing') then raise exception 'Resultado inválido' using errcode='22023';end if;
 select * into q from private.push_fila where lease=p_lease and lease_ate>now() for update;
 if not found then raise exception 'Reserva expirada' using errcode='40001';end if;
 if p_resultado='ticket' and (p_ticket is null or char_length(p_ticket) not between 1 and 200) then raise exception 'Ticket inválido' using errcode='22023';end if;
 if p_resultado='invalid' then update private.push_dispositivos set ativo=false,revisao=revisao+1 where instalacao=q.instalacao and revisao=q.revisao and usuario_id=q.usuario_id;end if;
 update private.push_fila set lease=null,lease_ate=null,
 estado=case when p_resultado='ticket' then 'recibo' when p_resultado='ok' then 'concluida'
  when p_resultado in ('retry','missing') and (q.ticket is not null or q.tentativas<5) and q.criado_em>now()-interval '1 day' then case when q.ticket is null then 'pendente' else 'recibo' end else 'falha' end,
 ticket=case when p_resultado='ticket' then p_ticket else q.ticket end,
 erro=case when p_resultado in ('ticket','ok') then null else p_resultado end,
 proxima_em=now()+case when p_resultado in ('ticket','missing') or q.ticket is not null then interval '15 minutes' else interval '1 minute'*power(2,least(q.tentativas,6)) end
 where id=q.id;
end $$;
create function public.finalizar_push(p_lease uuid,p_resultado text,p_ticket text default null) returns void language sql security invoker set search_path='' as $$select private.finalizar_push(p_lease,p_resultado,p_ticket)$$;
revoke all on function private.reservar_push(text),public.reservar_push(text),private.finalizar_push(uuid,text,text),public.finalizar_push(uuid,text,text) from public,anon,authenticated,service_role;
grant execute on function private.reservar_push(text),public.reservar_push(text),private.finalizar_push(uuid,text,text),public.finalizar_push(uuid,text,text) to service_role;

create function private.limpar_push() returns integer language plpgsql security invoker set search_path='' as $$
declare n integer;m integer;begin
 with candidates as(select id from private.push_fila where criado_em<now()-interval '30 days' order by criado_em,id for update skip locked limit 5000)
 delete from private.push_fila q using candidates c where q.id=c.id;get diagnostics n=row_count;
 with candidates as(select instalacao from private.push_dispositivos where visto_em<now()-interval '90 days' order by visto_em,instalacao for update skip locked limit 500)
 delete from private.push_dispositivos d using candidates c where d.instalacao=c.instalacao;get diagnostics m=row_count;return n+m;
end $$;
revoke all on function private.limpar_push() from public,anon,authenticated,service_role;
do $$begin if to_regnamespace('cron') is not null then perform cron.schedule('elas-push-retention','30 * * * *','select private.limpar_push()');end if;end $$;
-- Owner-only installation; secrets stay in Vault, never in migration history.
create function private.programar_push(p_endpoint text,p_projeto uuid,p_ativo boolean default false) returns bigint
 language plpgsql security invoker set search_path='' as $fn$
declare token text;job bigint;begin
 if p_endpoint is null or p_endpoint !~ '^https://[a-z0-9-]+[.]supabase[.]co/functions/v1/push-delivery$' or p_ativo is null or (p_ativo and p_projeto is null) then raise exception 'Configuração inválida';end if;
 if to_regnamespace('vault') is null or to_regnamespace('cron') is null then raise exception 'Configure Vault e Cron';end if;
 select decrypted_secret into token from vault.decrypted_secrets where name='elas_push_job_token';
 if token is null then token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');perform vault.create_secret(token,'elas_push_job_token','ELAS push delivery worker');end if;
 update private.push_config set endpoint=p_endpoint,projeto_expo=p_projeto,ativo=p_ativo,token_hash=encode(sha256(convert_to(token,'UTF8')),'hex') where id;
 select cron.schedule('elas-push-delivery','* * * * *',$job$
  select net.http_post(url:=(select endpoint from private.push_config where id),
  headers:=jsonb_build_object('Content-Type','application/json','x-push-job-key',(select decrypted_secret from vault.decrypted_secrets where name='elas_push_job_token')),
  body:='{}'::jsonb,timeout_milliseconds:=60000) where (select ativo from private.push_config where id);
 $job$) into job;
 perform cron.alter_job(job,active:=p_ativo);return job;
end $fn$;
revoke all on function private.programar_push(text,uuid,boolean) from public,anon,authenticated,service_role;
create or replace function public.versao_app() returns integer language sql immutable security invoker set search_path='' as $$select 11$$;
notify pgrst,'reload schema';
