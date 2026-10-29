-- Runtime readiness, not a claim of physical delivery or a completed deployment.
create function private.capacidades_backend() returns jsonb language plpgsql stable security definer set search_path='' as $$begin
 /* elas_active_account_guard */ if not (select private.conta_disponivel()) then raise exception 'Conta indisponível' using errcode='42501';end if; /* elas_active_account_guard_end */
 if auth.uid() is null then raise exception 'Acesso negado' using errcode='42501';end if;
 return jsonb_build_object('version',public.versao_app(),
  'atomicCatalog',to_regprocedure('public.confirmar_catalogo_ingestao(uuid,jsonb)') is not null,
  'accountErasureDatabase',to_regclass('private.contas_exclusao') is not null,
  'adminRoles',to_regprocedure('public.alterar_papel(uuid,text,text,text)') is not null,
  'pushEnabled',coalesce((select ativo and projeto_expo is not null from private.push_config where id),false));
end $$;
create function public.capacidades_backend() returns jsonb language sql stable security invoker set search_path='' as $$select private.capacidades_backend()$$;
revoke all on function private.capacidades_backend(),public.capacidades_backend() from public,anon,authenticated,service_role;
grant execute on function private.capacidades_backend(),public.capacidades_backend() to authenticated;
-- Generic stale-token sessions are checked by active-account guards. Roles are read fresh.
notify pgrst,'reload schema';
