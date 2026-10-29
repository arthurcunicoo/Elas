-- Staging first. No deletion is initiated by applying this migration.
create table private.contas_exclusao (
 id uuid primary key default gen_random_uuid(), usuario_id uuid unique,
 estado text not null check(estado in ('processando','concluida')), lease uuid,
 lease_ate timestamptz, criado_em timestamptz not null default now(), concluido_em timestamptz
);
alter table private.contas_exclusao enable row level security;
revoke all on private.contas_exclusao from public,anon,authenticated,service_role;
create function private.conta_disponivel() returns boolean language sql stable security definer set search_path='' as $$
 select exists(select 1 from auth.users where id=(select auth.uid())) and not exists(select 1 from private.contas_exclusao where usuario_id=(select auth.uid()) and estado='processando')
$$;
revoke all on function private.conta_disponivel() from public,anon,service_role;
grant execute on function private.conta_disponivel() to authenticated;
-- Restrictive guards combine with the existing ownership/role policies, never replace them.
do $$declare r record;begin
 for r in select tablename from pg_tables where schemaname='public' and rowsecurity loop
  execute format('create policy conta_ativa_guard on public.%I as restrictive for all to authenticated using ((select private.conta_disponivel())) with check ((select private.conta_disponivel()))',r.tablename);
 end loop;
end $$;
create policy conta_ativa_guard on storage.objects as restrictive for all to authenticated
 using ((select private.conta_disponivel())) with check ((select private.conta_disponivel()));
create function private.iniciar_exclusao_conta(p_usuario uuid) returns uuid language plpgsql security definer set search_path='' as $$
declare v private.contas_exclusao;v_lease uuid:=gen_random_uuid();begin
 if not exists(select 1 from auth.users where id=p_usuario) then raise exception 'Conta indisponível' using errcode='22023';end if;
 perform pg_advisory_xact_lock(hashtextextended(p_usuario::text,0));
 select * into v from private.contas_exclusao where usuario_id=p_usuario for update;
 if found and v.lease_ate>now() then return null;end if;
 insert into private.contas_exclusao(usuario_id,estado,lease,lease_ate) values(p_usuario,'processando',v_lease,now()+interval '2 minutes')
 on conflict(usuario_id) do update set lease=excluded.lease,lease_ate=excluded.lease_ate;
 delete from private.push_dispositivos where usuario_id=p_usuario;
 delete from private.papeis where usuario_id=p_usuario;
 return v_lease;
end $$;
create function public.iniciar_exclusao_conta(p_usuario uuid) returns uuid language sql security invoker set search_path='' as $$select private.iniciar_exclusao_conta(p_usuario)$$;
revoke all on function private.iniciar_exclusao_conta(uuid),public.iniciar_exclusao_conta(uuid) from public,anon,authenticated;
grant execute on function private.iniciar_exclusao_conta(uuid),public.iniciar_exclusao_conta(uuid) to service_role;
-- Auth deletes and all FK cascades run in one transaction. Audit subjects are removed;
-- actions on others' records retain only their transition, with actor/reason anonymized.
create function private.finalizar_exclusao_conta() returns trigger language plpgsql security definer set search_path='' as $$begin
 update public.notificacoes set mensagem='Há uma atualização na sua participação. Abra o registro para conferir.' where registro_id in (select registro_id from public.historico_status where responsavel_id=old.id);
 delete from public.historico_status where usuario_id=old.id;
 update public.historico_status set responsavel_id=null,motivo='Autoria e motivo removidos por exclusão de conta' where responsavel_id=old.id;
 update private.contas_exclusao set usuario_id=null,estado='concluida',lease=null,lease_ate=null,concluido_em=now() where usuario_id=old.id;
 return old;
end $$;
revoke all on function private.finalizar_exclusao_conta() from public,anon,authenticated,service_role;
create trigger elas_conta_excluida before delete on auth.users for each row execute function private.finalizar_exclusao_conta();
-- Guard the main elevated read RPC too; deleting an Auth user does not invalidate a JWT.
do $guard$
declare definition text;
begin
 select pg_get_functiondef('public.pagina_app(text,jsonb,jsonb)'::regprocedure) into definition;
 execute regexp_replace(definition, '\mbegin\M', 'begin if not (select private.conta_disponivel()) then raise exception ''Conta indisponível'' using errcode=''42501'';end if;', 'i');
end $guard$;
-- RLS does not constrain SECURITY DEFINER functions. Guard every existing elevated
-- PL/pgSQL entry point executable by authenticated, including older RPC overloads.
-- SQL role helpers stay unchanged; service-only jobs and triggers are excluded.
do $rpc_guard$
declare r record; definition text;
begin
 for r in select p.oid from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  join pg_language l on l.oid=p.prolang
  where n.nspname='private' and p.prosecdef and l.lanname='plpgsql'
   and has_function_privilege('authenticated',p.oid,'execute') loop
  definition:=pg_get_functiondef(r.oid);
  if definition !~ '\mbegin\M' then raise exception 'Missing RPC guard boundary';end if;
  execute regexp_replace(definition, '\mbegin\M', 'begin /* elas_active_account_guard */ if not (select private.conta_disponivel()) then raise exception ''Conta indisponível'' using errcode=''42501'';end if; /* elas_active_account_guard_end */', 'i');
 end loop;
end $rpc_guard$;
