-- Keep role changes and the last-admin invariant inside the database.
create table private.admin_control (
 id boolean primary key default true check(id), admin_count integer not null check(admin_count>=0)
);
insert into private.admin_control(id,admin_count) select true,count(*) from private.papeis where papel='admin';
create table private.papeis_historico (
 id uuid primary key default gen_random_uuid(), usuario_id uuid references auth.users(id) on delete set null,
 responsavel_id uuid references auth.users(id) on delete set null,
 anterior text not null, novo text not null, motivo text not null,
 criado_em timestamptz not null default clock_timestamp()
);
create index papeis_historico_cursor on private.papeis_historico(criado_em desc,id desc);
create index papeis_historico_usuario on private.papeis_historico(usuario_id,criado_em desc,id desc);
create index papeis_historico_responsavel on private.papeis_historico(responsavel_id);
alter table private.admin_control enable row level security;
alter table private.papeis_historico enable row level security;
revoke all on private.admin_control,private.papeis_historico from public,anon,authenticated,service_role;
create function private.auditar_papel() returns trigger language plpgsql security definer set search_path='' as $$
declare delta integer;actor uuid;reason text;before_role text;after_role text;target uuid;
begin
 before_role:=case when tg_op='INSERT' then 'usuario' else old.papel end;
 after_role:=case when tg_op='DELETE' then 'usuario' else new.papel end;
 target:=case when tg_op='DELETE' then old.usuario_id else new.usuario_id end;
 if tg_op='UPDATE' and new.usuario_id<>old.usuario_id then raise exception 'Identidade do papel não pode mudar' using errcode='22023';end if;
 if before_role=after_role then return coalesce(new,old);end if;
 delta:=(after_role='admin')::integer-(before_role='admin')::integer;
 if delta<>0 then
  -- A conditional row UPDATE serializes concurrent decrements even under repeatable read.
  update private.admin_control set admin_count=admin_count+delta where id and (delta>0 or admin_count+delta>=1);
  if not found then raise exception 'Transfira a administração antes de remover o último administrador.' using errcode='23514';end if;
 end if;
 select id into actor from auth.users where id=auth.uid();
 reason:=nullif(current_setting('elas.role_change_reason',true),'');
 insert into private.papeis_historico(usuario_id,responsavel_id,anterior,novo,motivo)
 values(case when exists(select 1 from auth.users where id=target) then target else null end,actor,before_role,after_role,coalesce(reason,'Operação administrativa no banco'));
 return coalesce(new,old);
end $$;
revoke all on function private.auditar_papel() from public,anon,authenticated,service_role;
create trigger papeis_auditoria before insert or update or delete on private.papeis for each row execute function private.auditar_papel();
-- Cascade removal of the last administrator must fail before Auth/Storage erasure starts.
create function private.proteger_exclusao_admin() returns trigger language plpgsql security definer set search_path='' as $$begin
 if exists(select 1 from private.papeis where usuario_id=old.id and papel='admin') then
  perform 1 from private.admin_control where id for update;
  if (select admin_count from private.admin_control where id)<=1 then
   raise exception 'Transfira a administração antes de remover o último administrador.' using errcode='23514';
  end if;
 end if;
 update private.papeis_historico set motivo='Conta excluída',usuario_id=null where usuario_id=old.id;
 update private.papeis_historico set motivo='Responsável excluído',responsavel_id=null where responsavel_id=old.id;
 return old;
end $$;
revoke all on function private.proteger_exclusao_admin() from public,anon,authenticated,service_role;
create trigger elas_admin_exclusao before delete on auth.users for each row execute function private.proteger_exclusao_admin();
create function private.alterar_papel(p_usuario uuid,p_papel text,p_anterior text,p_motivo text) returns text
language plpgsql security definer set search_path='' as $$
declare previous_role text;
begin
 /* elas_active_account_guard */ if not (select private.conta_disponivel()) then raise exception 'Conta indisponível' using errcode='42501';end if; /* elas_active_account_guard_end */
 perform 1 from private.admin_control where id for update;
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso negado' using errcode='42501';end if;
 if p_papel is null or p_papel not in ('usuario','moderador','admin') or p_anterior is null or p_anterior not in ('usuario','moderador','admin')
  or p_motivo is null or char_length(btrim(p_motivo)) not between 5 and 500 then raise exception 'Dados inválidos' using errcode='22023';end if;
 perform 1 from auth.users where id=p_usuario for update;
 if not found or exists(select 1 from private.contas_exclusao where usuario_id=p_usuario and estado='processando') then raise exception 'Conta indisponível' using errcode='22023';end if;
 select papel into previous_role from private.papeis where usuario_id=p_usuario for update;
 previous_role:=coalesce(previous_role,'usuario');
 if previous_role<>p_anterior then raise exception 'O papel mudou. Atualize antes de continuar.' using errcode='40001';end if;
 if previous_role=p_papel then raise exception 'Escolha um papel diferente.' using errcode='22023';end if;
 perform set_config('elas.role_change_reason',btrim(p_motivo),true);
 if p_papel='usuario' then delete from private.papeis where usuario_id=p_usuario;
 else insert into private.papeis(usuario_id,papel) values(p_usuario,p_papel) on conflict(usuario_id) do update set papel=excluded.papel;end if;
 return p_papel;
end $$;
create function public.alterar_papel(p_usuario uuid,p_papel text,p_anterior text,p_motivo text) returns text
language sql security invoker set search_path='' as $$select private.alterar_papel(p_usuario,p_papel,p_anterior,p_motivo)$$;
create function private.pagina_papeis(p_busca text,p_cursor jsonb,p_historico boolean) returns jsonb
language plpgsql stable security definer set search_path='' as $$
declare scope text;stamp timestamptz;key text;row_id uuid;rows jsonb;next_cursor jsonb;search text:=btrim(coalesce(p_busca,''));
begin
 /* elas_active_account_guard */ if not (select private.conta_disponivel()) then raise exception 'Conta indisponível' using errcode='42501';end if; /* elas_active_account_guard_end */
 if auth.uid() is null or private.meu_papel()<>'admin' then raise exception 'Acesso negado' using errcode='42501';end if;
 if char_length(search)>100 or p_historico is null then raise exception 'Filtro inválido' using errcode='22023';end if;
 scope:=md5('admin_roles:'||auth.uid()::text||':'||search||':'||p_historico::text);
 stamp:=coalesce((p_cursor->>'at')::timestamptz,clock_timestamp());
 if p_cursor is not null and (jsonb_typeof(p_cursor)<>'object' or p_cursor->>'v' is distinct from '1' or p_cursor->>'scope' is distinct from scope
  or coalesce(p_cursor->>'key','')='' or coalesce(p_cursor->>'id','')='' or not isfinite(stamp) or stamp>clock_timestamp()+interval '5 minutes') then
  raise exception 'Cursor inválido' using errcode='22023';end if;
 key:=p_cursor->>'key';row_id:=(p_cursor->>'id')::uuid;
 if p_historico then
  select coalesce(jsonb_agg(to_jsonb(q) order by q.criado_em desc,q.id desc),'[]'::jsonb) into rows from (
   select h.id,h.usuario_id,h.responsavel_id,h.anterior,h.novo,h.motivo,h.criado_em,h.criado_em::text as _key,coalesce(p.nome,'Conta excluída') as nome,coalesce(a.nome,'Operação no banco') as responsavel
   from private.papeis_historico h left join public.perfis p on p.id=h.usuario_id left join public.perfis a on a.id=h.responsavel_id where h.criado_em<=stamp and (key is null or (h.criado_em,h.id)<(key::timestamptz,row_id))
   order by h.criado_em desc,h.id desc limit 21) q;
 else
  select coalesce(jsonb_agg(to_jsonb(q) order by q.nome,q.id),'[]'::jsonb) into rows from (
   select p.id,p.nome,coalesce(r.papel,'usuario') as papel,p.nome as _key from public.perfis p
   left join private.papeis r on r.usuario_id=p.id where p.criado_em<=stamp and private.normalizar_busca(p.nome) like '%'||private.normalizar_busca(search)||'%'
   and not exists(select 1 from private.contas_exclusao e where e.usuario_id=p.id and e.estado='processando')
   and (key is null or (p.nome,p.id)>(key,row_id)) order by p.nome,p.id limit 21) q;
 end if;
 if jsonb_array_length(rows)>20 then
  next_cursor:=jsonb_build_object('v',1,'scope',scope,'at',to_char(stamp at time zone 'UTC','YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),'key',rows->19->>'_key','id',rows->19->>'id');
  rows:=rows-20;
 end if;
 return jsonb_build_object('rows',rows,'nextCursor',next_cursor);
end $$;
create function public.pagina_papeis(p_busca text default '',p_cursor jsonb default null,p_historico boolean default false) returns jsonb
language sql stable security invoker set search_path='' as $$select private.pagina_papeis(p_busca,p_cursor,p_historico)$$;
revoke all on function private.alterar_papel(uuid,text,text,text),public.alterar_papel(uuid,text,text,text),private.pagina_papeis(text,jsonb,boolean),public.pagina_papeis(text,jsonb,boolean) from public,anon,authenticated,service_role;
grant execute on function private.alterar_papel(uuid,text,text,text),public.alterar_papel(uuid,text,text,text),private.pagina_papeis(text,jsonb,boolean),public.pagina_papeis(text,jsonb,boolean) to authenticated;
create or replace function public.versao_app() returns integer language sql immutable security invoker set search_path='' as $$select 12$$;
notify pgrst,'reload schema';
