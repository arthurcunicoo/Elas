import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createHash} from 'node:crypto';
import {createTestDatabase} from '../scripts/test-database.mjs';
const root=path.resolve(import.meta.dirname,'..'),out=fs.mkdtempSync(path.join(os.tmpdir(),'elas-restore-drill-'));
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const hash=data=>createHash('sha256').update(data).digest('hex');
let source=createTestDatabase(),restored;
try {
 await source.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid default gen_random_uuid() primary key,bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 await source.exec('create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[])');
 for(const file of fs.readdirSync(path.join(root,'supabase/migrations')).filter(f=>f.endsWith('.sql')).sort()) {
  await source.exec(fs.readFileSync(path.join(root,'supabase/migrations',file),'utf8'));
  await source.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[file.slice(0,14),file.slice(15,-4)]);
 }
 await source.exec(fs.readFileSync(path.join(root,'supabase/seed.sql'),'utf8'));
 await source.query('insert into auth.users values($1),($2)',[owner,other]);
 await source.query("insert into public.avaliacoes(usuario_id,lugar_id,sentimento,comentario,status) values($1,'nereu','Segura','Conteúdo privado do exercício','aprovada')",[owner]);
 await source.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[owner+'/photo.jpg']);
 await source.query("update private.push_config set ativo=true,projeto_expo=$1,endpoint='https://fixture.supabase.co/functions/v1/push-delivery',token_hash=repeat('a',64)",[other]);
 await source.query("insert into private.push_dispositivos(instalacao,usuario_id,token,plataforma) values($1,$2,'ExpoPushToken[restore_fixture_01234567890]','android')",[other,owner]);
 await source.query("insert into public.notificacoes(usuario_id,titulo,mensagem,tipo,registro_id) values($1,'Fixture','Restore fixture','relato',$2)",[owner,other]);
 const asset=fs.readFileSync(path.join(root,'assets/city-modern.jpg'));
 fs.writeFileSync(path.join(out,'storage-photo.jpg'),asset,{mode:0o600});
 const counts=async db=>(await db.query("select (select count(*)::int from supabase_migrations.schema_migrations) migrations,(select count(*)::int from auth.users) users,(select count(*)::int from public.lugares) places,(select count(*)::int from public.avaliacoes) reviews,(select count(*)::int from storage.objects) objects,public.versao_app() version")).rows[0];
 const before=await counts(source),dump=Buffer.from(await(await source.dumpDataDir()).arrayBuffer());fs.writeFileSync(path.join(out,'database.tar'),dump,{mode:0o600});
 const manifest={format:'pglite-local-fixture-v1',createdAt:new Date().toISOString(),counts:before,databaseSha256:hash(dump),storageSha256:hash(asset)};fs.writeFileSync(path.join(out,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});
 await source.close();source=null;
 assert.equal(hash(fs.readFileSync(path.join(out,'database.tar'))),manifest.databaseSha256);
 restored=createTestDatabase({loadDataDir:new Blob([fs.readFileSync(path.join(out,'database.tar'))])});assert.deepEqual(await counts(restored),before);assert.equal(before.migrations,fs.readdirSync(path.join(root,'supabase/migrations')).filter(name=>name.endsWith('.sql')).length);
 await restored.exec(fs.readFileSync(path.join(root,'supabase/RESTORE-CUSTOMIZACOES.sql'),'utf8'));
 await restored.exec(fs.readFileSync(path.join(root,'supabase/RESTORE-CUSTOMIZACOES.sql'),'utf8'));
 assert.equal((await restored.query('select ativo from private.push_config')).rows[0].ativo,false,'staging restore must disable source push');
 assert.equal((await restored.query('select count(*)::int n from private.push_dispositivos where ativo')).rows[0].n,0);
 assert.equal((await restored.query("select count(*)::int n from private.push_fila where estado<>'cancelada'")).rows[0].n,0);
 assert.equal(hash(fs.readFileSync(path.join(out,'storage-photo.jpg'))),manifest.storageSha256,'storage bytes require their own backup, not just SQL metadata');
 await restored.exec(`set role authenticated;select set_config('request.jwt.claim.sub','${other}',false)`);
 assert.equal((await restored.query('select count(*)::int n from public.avaliacoes')).rows[0].n,0,'restore must preserve review ownership');
 await restored.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${owner}',false)`);
 assert.equal((await restored.query('select count(*)::int n from public.avaliacoes')).rows[0].n,1);
 assert.equal((await restored.query("select count(*)::int n from storage.objects where bucket_id='avatars'")).rows[0].n,1);
 await restored.exec('reset role;set role anon');await assert.rejects(restored.exec('select public.resumos_avaliacoes(array[\'nereu\'],true)'));
 const damaged=Buffer.from(dump);damaged[0]^=1;assert.notEqual(hash(damaged),manifest.databaseSha256,'corruption must fail integrity before restore');
 console.log('Local restore drill passed: closed source, new restored database, all migrations/data/auth shim/Storage metadata, separate asset bytes, checksum rejection and preserved RLS. This is not a managed Supabase backup or production restore.');
} finally {if(source)await source.close();if(restored)await restored.close();}
