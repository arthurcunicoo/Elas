-- Restore only in a disposable target, after the database import.
-- Supabase's normal schema dump excludes custom policies on managed schemas.
-- These are the four Storage policies owned by ELAS in schema version 10.
-- Still current in schema 11. Staging restore must never retain live push configuration.
alter table storage.objects enable row level security;
drop policy if exists elas_avatar_read on storage.objects;
drop policy if exists elas_avatar_insert on storage.objects;
drop policy if exists elas_avatar_update on storage.objects;
drop policy if exists elas_avatar_delete on storage.objects;
create policy elas_avatar_read on storage.objects for select to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy elas_avatar_insert on storage.objects for insert to authenticated with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy elas_avatar_update on storage.objects for update to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy elas_avatar_delete on storage.objects for delete to authenticated using(bucket_id='avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
do $$begin
 if to_regclass('private.push_config') is not null then
  update private.push_config set ativo=false,endpoint=null,token_hash=null,projeto_expo=null;
  update private.push_dispositivos set ativo=false,revisao=revisao+1 where ativo;
  update private.push_fila set estado='cancelada',lease=null,lease_ate=null where estado in ('pendente','enviando','recibo');
 end if;
end $$;
