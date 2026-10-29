// Reproducible schema types from migrations when a remote project is unavailable.
import { createTestDatabase } from './test-database.mjs';
import { readdir,readFile,writeFile } from 'node:fs/promises';
const db=createTestDatabase();
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(`create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 for(const file of (await readdir('supabase/migrations')).filter(f=>f.endsWith('.sql')).sort())await db.exec(await readFile('supabase/migrations/'+file,'utf8'));
 const tables=(await db.query(`select table_name from information_schema.tables where table_schema='public' and table_type='BASE TABLE' order by table_name`)).rows;
 const ts=t=>/bool/.test(t)?'boolean':/int|numeric|float|double/.test(t)?'number':/json/.test(t)?'Json':t.endsWith('[]')?ts(t.slice(0,-2))+'[]':'string';
 let output=`// Generated from the complete incremental migrations by scripts/generate-db-types.mjs.\nexport type Json=string|number|boolean|null|{[key:string]:Json|undefined}|Json[];\nexport type Database={__InternalSupabase:{PostgrestVersion:'14.18'};public:{Tables:{\n`;
 for(const {table_name:name} of tables){
  const cols=(await db.query(`select column_name,data_type,is_nullable,column_default from information_schema.columns where table_schema='public' and table_name=$1 order by ordinal_position`,[name])).rows;
  output+=`${name}:{\n`;
  for(const mode of ['Row','Insert','Update'])output+=`${mode}:{${cols.map(c=>`${c.column_name}${mode==='Update'||mode==='Insert'&&(c.column_default!==null||c.is_nullable==='YES')?'?':''}:${ts(c.data_type)}${c.is_nullable==='YES'?'|null':''}`).join(';')}};\n`;
  const fks=(await db.query(`select c.conname,n.nspname parent_schema,p.relname parent,a.attname col,b.attname parent_col from pg_constraint c join pg_class t on t.oid=c.conrelid join pg_namespace s on s.oid=t.relnamespace join pg_class p on p.oid=c.confrelid join pg_namespace n on n.oid=p.relnamespace join pg_attribute a on a.attrelid=t.oid and a.attnum=c.conkey[1] join pg_attribute b on b.attrelid=p.oid and b.attnum=c.confkey[1] where c.contype='f' and s.nspname='public' and t.relname=$1 and cardinality(c.conkey)=1`,[name])).rows;
  output+=`Relationships:[${fks.filter(f=>f.parent_schema==='public').map(f=>`{foreignKeyName:'${f.conname}';columns:['${f.col}'];isOneToOne:false;referencedRelation:'${f.parent}';referencedColumns:['${f.parent_col}']}`).join(',')}];};\n`;
 }
 output+='};Views:{[_ in never]:never};Functions:{\n';
 const funcs=(await db.query(`select p.proname,p.proargnames,p.proargtypes::oid[] argtypes,p.prorettype::regtype::text result,p.proretset from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' order by p.proname`)).rows;
 const signatures = new Map();
 for (const f of funcs) {
  const args=[];
  for(let i=0;i<(f.proargnames??[]).length;i++) {
   const r=await db.query('select $1::oid::regtype::text t',[f.argtypes[i]]);
   args.push(`${f.proargnames[i]}:${ts(r.rows[0].t)}`);
  }
  const signature=`{Args:{${args.join(';')}};Returns:${f.proretset?`Database['public']['Tables']['${f.result.replace('public.','')}']['Row'][]`:f.result==='void'?'undefined':ts(f.result)}}`;
  signatures.set(f.proname,[...(signatures.get(f.proname)??[]),signature]);
 }
 for (const [name,choices] of signatures) output+=`${name}:${choices.join('|')};\n`;
 output+='};Enums:{[_ in never]:never};CompositeTypes:{[_ in never]:never}}};\nexport type Tables<T extends keyof Database["public"]["Tables"]>=Database["public"]["Tables"][T]["Row"];\n';
 await writeFile(process.argv[2] ?? 'lib/database.types.ts',output);console.log(`Generated types for ${tables.length} tables and ${funcs.length} public functions from migrations.`);
}finally{await db.close();}
