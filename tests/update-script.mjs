import { createTestDatabase } from '../scripts/test-database.mjs';
import { readFileSync,readdirSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=createTestDatabase();
try {
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
 create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;
 alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;
 create schema supabase_migrations;create table supabase_migrations.schema_migrations(version text primary key,name text,statements text[]);`);
 const base=readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(f=>f.endsWith('.sql') && f<'20261008182530').sort();
 for (const file of base) {await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));await db.query('insert into supabase_migrations.schema_migrations(version,name) values($1,$2)',[file.slice(0,14),file]);}
 const update=readFileSync(new URL('../supabase/ATUALIZACAO.sql',import.meta.url),'utf8');
 await db.exec("insert into auth.users(id) values('00000000-0000-0000-0000-000000000001');insert into public.lugares(id,nome,endereco,latitude,longitude) values('preservar','Lugar existente','Centro',-28.67,-49.37);insert into public.avaliacoes(usuario_id,lugar_id,sentimento,comentario) values('00000000-0000-0000-0000-000000000001','preservar','Segura','Comentário privado preservado')");
 await assert.rejects(db.exec(update.replace('create table private.politica_avaliacoes (', 'select 1/0; create table private.politica_avaliacoes (')));
 await db.exec('rollback');
 assert.equal((await db.query('select count(*) n from supabase_migrations.schema_migrations')).rows[0].n,6,'a late failure must roll back earlier migrations and their history');
 assert.equal((await db.query("select count(*) n from information_schema.columns where table_schema='public' and table_name='lugares' and column_name='cadastro_revisao'")).rows[0].n,0);
 await db.exec(update);await db.exec(update);
 assert.equal((await db.query('select count(*) n from supabase_migrations.schema_migrations')).rows[0].n,readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(name=>name.endsWith('.sql')).length);
 assert.equal((await db.query('select public.versao_app() version')).rows[0].version,12);
 assert.deepEqual((await db.query('select comentario,lugar_id from public.avaliacoes')).rows,[{comentario:'Comentário privado preservado',lugar_id:'preservar'}]);
 assert.equal((await db.query("select public from storage.buckets where id='avatars'")).rows[0].public,false);
 console.log('Atomic update script passed: late failure rolls everything back; two successful runs preserve 20 history entries, existing reviews/places and private avatar bucket. Auth/Storage schemas are simulated.');
} finally {await db.close();}
