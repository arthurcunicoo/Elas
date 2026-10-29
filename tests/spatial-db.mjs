import { createTestDatabase } from '../scripts/test-database.mjs';
import { readFileSync,readdirSync,writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
const db=createTestDatabase(), A='00000000-0000-0000-0000-000000000001', B='00000000-0000-0000-0000-000000000002', ADMIN='00000000-0000-0000-0000-000000000003';
const asUser=async id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id??''}',false)`);
const page=async(list,filters={},cursor=null)=>(await db.query('select public.pagina_app($1,$2,$3) data',[list,cursor,filters])).rows[0].data;
const map=async(zoom=15)=>(await db.query('select public.mapa_relatos(-28.70,-49.40,-28.66,-49.34,$1) data',[zoom])).rows[0].data;
const catalog=async(category='all',bounds=[-28.70,-49.40,-28.66,-49.34])=>(await db.query('select public.mapa_lugares($1,$2,$3,$4,$5) data',[...bounds,category])).rows[0].data;
try{
 await db.exec(`create role anon;create role authenticated;create role service_role bypassrls;create schema auth;create table auth.users(id uuid primary key);
 create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
 grant usage on schema public,auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;
 create schema storage;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);
 create function storage.foldername(name text) returns text[] language sql immutable as $$select string_to_array(name,'/')$$;alter table storage.objects enable row level security;grant usage on schema storage to authenticated;grant select,insert,update,delete on storage.objects to authenticated;`);
 for(const file of readdirSync(new URL('../supabase/migrations/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())await db.exec(readFileSync(new URL('../supabase/migrations/'+file,import.meta.url),'utf8'));
 await db.query('insert into auth.users values($1),($2),($3)',[A,B,ADMIN]);await db.query("insert into private.papeis(usuario_id,papel) values($1,'admin')",[ADMIN]);
 await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto,latitude,longitude,status) select $1,'Iluminação','Iluminação precisa melhorar','Centro',-28.678,-49.369,'verificado' from generate_series(1,430)",[A]);
 await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto,latitude,longitude,status) values($1,'Outro','Pedido particular de análise','Rua própria',-28.678,-49.369,'pendente'),($2,'Outro','Segredo de outra pessoa','Rua privada',-28.678,-49.369,'pendente'),($1,'Outro','Ocorrência já resolvida','Rua resolvida',-28.678,-49.369,'resolvido'),($1,'Outro','Sem coordenadas no mapa','Local por texto',null,null,'verificado')",[A,B]);
 await asUser(A);let data=await map();assert.equal(data.total,431);assert.equal(data.nodes.length,1);assert.equal(data.nodes[0].count,431);assert.equal(data.nodes[0].report,null);
 assert.ok(!JSON.stringify(data).includes('Segredo de outra pessoa'));assert.ok(!JSON.stringify(data).includes('usuario_id'));
 const filters={mapa:true,area:[-28.67800001,-49.36900001,-28.67799999,-49.36899999]};
 const all=[];let cursor=null;do{const p=await page('relatos_area',filters,cursor);all.push(...p.rows);cursor=p.nextCursor;}while(cursor);
 assert.equal(all.length,431);assert.equal(new Set(all.map(r=>r.id)).size,431,'every old occurrence remains accessible beyond the old 100 limit');
 await asUser(B);data=await map();assert.equal(data.total,431);assert.ok(!JSON.stringify(data).includes('Pedido particular'));
 await db.exec('reset role');
 await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto,latitude,longitude,status) select $1,'Outro','Relato distribuído no bairro','Centro',-28.69+(i%20)*.001,-49.39+floor(i/20.0)*.001,'verificado' from generate_series(1,400) i",[A]);
 await asUser(A);const broad=await map(12),close=await map(22);assert.equal(broad.total,831);assert.equal(close.total,831);assert.ok(broad.nodes.length<=49);assert.ok(close.nodes.length>broad.nodes.length);assert.equal(close.nodes.reduce((sum,n)=>sum+n.count,0),831);
 await assert.rejects(db.query('select public.mapa_relatos(0,0,1,1,99)'));await assert.rejects(db.query('select public.mapa_relatos(null,0,1,1,15)'));
 await db.exec('reset role');
 await db.exec("insert into public.lugares(id,nome,endereco,latitude,longitude,categoria) select 'store-'||i,'Loja local '||i,'Centro',-28.69+(i%20)*.001,-49.39+floor(i/20.0)*.0005,'clothes' from generate_series(1,1400) i");
 await db.exec("insert into public.lugares(id,nome,endereco,latitude,longitude,categoria) values('landmark-z','Hospital São José','Centro',-28.678,-49.369,'hospital'),('cafe','Cafeteria Aurora','Praça Central',-28.679,-49.369,'cafe'),('literal','100% Café','Centro',-28.679,-49.369,'cafe'),('far','Fora da região','Outro bairro',-25,-49,'mall')");
 await asUser(A);data=await catalog();assert.equal(data.total,1403);assert.equal(data.places.length,500);assert.equal(data.displayLimited,true);assert.equal(data.places[0].id,'landmark-z');assert.equal(data.places[0].relevancia,100);
 assert.ok(!JSON.stringify(data).includes('localizacao'));assert.ok(!data.places.some(p=>p.id==='far'));
 const cafes=await catalog('cafes');assert.equal(cafes.places.length,2);assert.ok(cafes.places.every(p=>p.categoria==='cafe'));
 const typo=await page('lugares',{busca:'cafeteria aurra',categoria:'all',tags:[],conhecidas:[]});assert.ok(typo.rows.some(p=>p.id==='cafe'));
 const accent=await page('lugares',{busca:'sao jose',categoria:'all',tags:[],conhecidas:[]});assert.ok(accent.rows.some(p=>p.id==='landmark-z'));
 const literal=await page('lugares',{busca:'100%',categoria:'all',tags:[],conhecidas:[]});assert.deepEqual(literal.rows.map(p=>p.id),['literal']);
 await db.exec('reset role');await db.exec("insert into public.service_areas(id,nome,estado,south,north,west,east,latitude,longitude) values('florianopolis','Florianópolis','SC',-27.8,-27.3,-48.8,-48.3,-27.6,-48.5);insert into public.lugares(id,nome,endereco,latitude,longitude,categoria) values('floripa','Lugar de outra cidade','Centro',-27.6,-48.5,'park')");
 await asUser(A);assert.equal((await catalog('all',[-27.61,-48.51,-27.59,-48.49])).places[0].id,'floripa');assert.equal((await db.query('select id from public.service_areas')).rows.length,2);await assert.rejects(db.query("update public.service_areas set ativa=false"));
 // Admin contains search and permissions remain intact with normalized GIN paths.
 await asUser(ADMIN);assert.ok((await page('admin_relato',{busca:'iluminacao'})).rows.length);assert.ok((await page('admin_lugar',{busca:'sao jose'})).rows.some(r=>r.id==='landmark-z'));
 await asUser(A);await assert.rejects(page('admin_relato',{busca:'iluminacao'}));await assert.rejects(db.query("select public.reservar_catalogo_job(repeat('a',64))"));await assert.rejects(db.query("select public.candidatos_catalogo('[]')"));
 // Verify actual PostgreSQL plans can use the spatial and trigram indexes.
 await db.exec('reset role;set enable_seqscan=off');
 const explain=async sql=>(await db.query('explain '+sql)).rows.map(r=>r['QUERY PLAN']).join('\n');
 assert.match(await explain("select id from public.lugares where private.normalizar_busca(nome||' '||endereco) like '%aurora%'"),/lugares_busca_trgm/);
 assert.match(await explain("select id from public.relatos where localizacao operator(gis.&&) gis.st_makeenvelope(-49.40,-28.70,-49.34,-28.66,4326)::gis.geography"),/relatos_geo_gist/);
 if(process.env.ELAS_BENCHMARK_OUTPUT){
  await db.exec('set enable_seqscan=on;analyze public.lugares;analyze public.relatos');
  const queries={placeSearch:"select id from public.lugares where private.normalizar_busca(nome||' '||endereco) like '%aurora%'",reportBounds:"select id from public.relatos where localizacao operator(gis.&&) gis.st_makeenvelope(-49.40,-28.70,-49.34,-28.66,4326)::gis.geography"};
  const plans={};for(const [name,sql] of Object.entries(queries))plans[name]=(await db.query('explain (analyze,buffers,format json) '+sql)).rows;
  writeFileSync(process.env.ELAS_BENCHMARK_OUTPUT,JSON.stringify({environment:'PGlite isolated fixture; not production; table queries as database owner',plans},null,2)+'\n');
 }
 // The private aggregate projects exactly the public + own-pending scope, with a
 // public invoker wrapper; direct table RLS would prevent non-leakproof GIS pushdown.
 assert.equal((await db.query("select prosecdef from pg_proc where oid='private.mapa_relatos(double precision,double precision,double precision,double precision,integer)'::regprocedure")).rows[0].prosecdef,true);
 assert.equal((await db.query("select prosecdef from pg_proc where oid='public.mapa_relatos(double precision,double precision,double precision,double precision,integer)'::regprocedure")).rows[0].prosecdef,false);
 await db.exec("reset role;set enable_seqscan=on;update private.catalog_job_config set endpoint='https://fixture.supabase.co/functions/v1/catalog-refresh',token_hash=repeat('a',64)");
 await db.exec('set role service_role');await assert.rejects(db.query("select public.reservar_catalogo_job(repeat('b',64))"));
 let lease=(await db.query("select public.reservar_catalogo_job(repeat('a',64)) data")).rows[0].data;assert.ok(lease.lease);assert.ok(lease.area.nome);
 const second=(await db.query("select public.reservar_catalogo_job(repeat('a',64)) data")).rows[0].data;assert.notEqual(second.lease,lease.lease);assert.notDeepEqual(second.bounds,lease.bounds);
 await db.query('select public.finalizar_catalogo_job($1,400,null)',[lease.lease]);await assert.rejects(db.query('select public.finalizar_catalogo_job($1,400,null)',[lease.lease]));
 await db.query("select public.finalizar_catalogo_job($1,0,'upstream_or_import_failed')",[second.lease]);
 const matches=(await db.query("select public.candidatos_catalogo($1) data",[[{nome:'Hospital São José',latitude:-28.678,longitude:-49.369,referencia_externa:'node/42'}]])).rows[0].data;
 assert.equal(matches.length,1);assert.equal(matches[0].id,'landmark-z');
 await db.exec('reset role');assert.equal((await db.query("select count(*)::int n from private.catalog_tiles where disabled")).rows[0].n,1);assert.equal((await db.query("select attempts from private.catalog_tiles where last_error is not null")).rows[0].attempts,1);
 await db.exec('set role anon');await assert.rejects(map());await assert.rejects(catalog());await assert.rejects(db.query('select * from public.service_areas'));
 console.log('Spatial DB checks passed: 831 visible reports without truncation, 431 coincident records with complete keyset drill-down, clustering/refinement/RLS, generated geography and GiST index eligibility and private scoped projection, 1403-to-500 SQL selection, typo/accent/literal search and GIN plan, admin permissions, configurable second city, machine-only leased queue, subdivision/backoff and bounded import candidates.');
}finally{await db.close();}
