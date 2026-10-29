import {createRefreshHandler} from "../supabase/functions/catalog-refresh/worker.ts";
import {parseOsmPlaces} from "../supabase/functions/lugares-osm/catalog.ts";
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { systemTestDatabase } from '../scripts/system-test-database.mjs';
const db=await systemTestDatabase(),A='00000000-0000-0000-0000-000000000001',B='00000000-0000-0000-0000-000000000002';
const asUser=id=>db.exec(`reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false)`);
try{
 await db.query('insert into auth.users values($1),($2)',[A,B]);
 await db.query("insert into public.perfis(id,nome) values($1,'Alice'),($2,'Beatriz')",[A,B]);
 await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto) values($1,'Outro','Relato sensível da conta A','Praça'),($2,'Outro','Relato da conta B','Centro')",[A,B]);
 await db.query("insert into public.historico_status(tipo,registro_id,usuario_id,responsavel_id,anterior,novo,motivo) values('relato','fixture-record',$1,$2,'pendente','verificado','Personal reason from deleting moderator')",[B,A]);
 await db.query("insert into public.notificacoes(usuario_id,titulo,mensagem,tipo,registro_id) values($1,'Atualização','Personal reason from deleting moderator','relato','fixture-record')",[B]);
 await asUser(A);assert.ok((await db.query("select public.pagina_app('registros_relato',null,'{}') data")).rows[0].data.rows.length===1);
 await assert.rejects(db.query('select public.iniciar_exclusao_conta($1)',[B]));
 await db.exec('reset role;set role service_role');
 const lease=(await db.query('select public.iniciar_exclusao_conta($1) lease',[A])).rows[0].lease;assert.ok(lease);
 assert.equal((await db.query('select public.iniciar_exclusao_conta($1) lease',[A])).rows[0].lease,null,'lease prevents concurrent erasure');
 await asUser(A);await assert.rejects(db.query("select public.pagina_app('registros_relato',null,'{}')"),e=>e.code==='42501');assert.equal((await db.query('select * from public.perfis')).rows.length,0);
 await assert.rejects(db.query("select public.enviar_registro('relato',gen_random_uuid(),'{\"categoria\":\"Outro\",\"descricao\":\"Tentativa durante exclusão\",\"local_texto\":\"Centro\"}')"),e=>e.code==='42501','elevated write RPC must not bypass erasure restriction');
 await assert.rejects(db.query("select private.detalhes_registro('relato',gen_random_uuid())"),e=>e.code==='42501','legacy elevated RPC must also enforce active account');
 await assert.rejects(db.query("insert into storage.objects(bucket_id,name) values('avatars',$1)",[A+'/new.png']));
 await asUser(B);assert.equal((await db.query('select * from public.perfis')).rows.length,1);
 await db.exec('reset role');await db.query('delete from auth.users where id=$1',[A]);
 assert.equal((await db.query('select count(*)::int n from public.relatos where usuario_id=$1',[A])).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from public.relatos where usuario_id=$1',[B])).rows[0].n,1);
 const history=(await db.query("select responsavel_id,motivo from public.historico_status where registro_id='fixture-record'")).rows[0];assert.equal(history.responsavel_id,null);assert.ok(!history.motivo.includes('Personal reason'));
 assert.ok(!(await db.query("select mensagem from public.notificacoes where registro_id='fixture-record'")).rows[0].mensagem.includes('Personal reason'));
 const job=(await db.query('select usuario_id,estado from private.contas_exclusao')).rows[0];assert.equal(job.usuario_id,null);assert.equal(job.estado,'concluida');
 await asUser(A);await assert.rejects(db.query("select public.pagina_app('registros_relato',null,'{}')"),e=>e.code==='42501','stale JWT uid cannot read after Auth deletion');
 await asUser(B);assert.equal((await db.query("select public.pagina_app('registros_relato',null,'{}') data")).rows[0].data.rows.length,1);
 await db.exec('reset role');
 await db.query("insert into public.lugares(id,nome,endereco,latitude,longitude,origem,referencia_externa) values('osm:node:1','Nome antigo','Centro',-28.678,-49.369,'osm','node/1')");
 const payload={elements:[
 {type:'node',id:1,lat:-28.678,lon:-49.369,tags:{name:'Biblioteca atualizada',amenity:'library'}},
 {type:'node',id:2,lat:-28.677,lon:-49.368,tags:{name:'Praça nova',leisure:'park'}},
 {type:'node',id:2,lat:-28.677,lon:-49.368,tags:{name:'Praça nova',leisure:'park'}},
 {type:'node',id:3,lat:0,lon:0,tags:{name:'Fora da região'}},
 {type:'node',id:4,lat:-28.678,lon:-49.369,tags:{}},
 ]};
 const counts={received:payload.elements.length,created:0,updated:0,discarded:0,rejected:0};let imported;
 const seen=new Set();for(const element of payload.elements){const one=parseOsmPlaces({elements:[element]},{south:-28.70,north:-28.66,west:-49.40,east:-49.34});if(!one.length)counts.rejected++;else if(seen.has(one[0].id))counts.discarded++;else seen.add(one[0].id);}
 const bounds={south:-28.70,north:-28.66,west:-49.40,east:-49.34};
 const fixtureLease=crypto.randomUUID();
 await db.query("insert into private.catalog_tiles(area_id,south,west,north,east,lease,lease_until) values('criciuma',-28.70,-49.40,-28.66,-49.34,$1,clock_timestamp()+interval '2 minutes')",[fixtureLease]);
 const handler=createRefreshHandler({reserve:async()=>({lease:fixtureLease,bounds,area:{id:'criciuma',nome:'Criciúma',estado:'SC'}}),
 candidates:async rows=>(await db.query('select public.candidatos_catalogo($1) data',[JSON.stringify(rows)])).rows[0].data,
 commit:async(lease,batch)=>{
  imported=batch.rows;
  const result=(await db.query('select public.confirmar_catalogo_ingestao($1,$2) data',[lease,JSON.stringify(batch)])).rows[0].data;
  Object.assign(counts,{created:result.created,updated:result.updated});return result;
 },fail:async()=>assert.fail('fixture import must commit')},async()=>Response.json(payload));
 const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{'x-catalog-job-key':'a'.repeat(64)}}));assert.equal(response.status,200);assert.equal(imported.length,2);
 assert.deepEqual(counts,{received:5,created:1,updated:1,discarded:1,rejected:2});assert.equal((await db.query("select nome from public.lugares where id='osm:node:1'")).rows[0].nome,'Biblioteca atualizada');
 console.log('Controlled isolated catalog import:',JSON.stringify(counts),'(fixture HTTP payload, real parser/reconciler/PostgreSQL; not a live Overpass import)');
 const M='00000000-0000-0000-0000-000000000003',N='00000000-0000-0000-0000-000000000004';
 await db.query('insert into auth.users values($1),($2)',[M,N]);await db.query("insert into private.papeis(usuario_id,papel) values($1,'moderador'),($2,'moderador')",[M,N]);
 const report=(await db.query("insert into public.relatos(usuario_id,categoria,descricao,local_texto) values($1,'Outro','Relato para duas decisões','Centro') returning id,moderacao_revisao",[B])).rows[0];
 const decision=(owner,status)=>db.transaction(async tx=>{await tx.exec("set local role authenticated");await tx.query("select set_config('request.jwt.claim.sub',$1,true)",[owner]);return tx.query("select public.moderar_revisao('relato',$1,$2,'Decisão concorrente conferida','pendente',$3)",[report.id,status,report.moderacao_revisao]);});
 const decisions=await Promise.allSettled([decision(M,'verificado'),decision(N,'resolvido')]);assert.equal(decisions.filter(r=>r.status==='fulfilled').length,1);assert.equal(decisions.find(r=>r.status==='rejected').reason.code,'40001');
 assert.equal((await db.query('select count(*)::int n from public.historico_status where registro_id=$1',[report.id])).rows[0].n,1);
 console.log('Two moderation intents with one expected revision: one committed, one rejected, one audit row (serialized local PostgreSQL transactions; not multi-connection load).');
 const unguarded=(await db.query("select p.proname from pg_proc p join pg_namespace n on n.oid=p.pronamespace join pg_language l on l.oid=p.prolang where n.nspname='private' and p.prosecdef and l.lanname='plpgsql' and has_function_privilege('authenticated',p.oid,'execute') and p.prosrc not like '%/* elas_active_account_guard */%'")).rows;
 assert.deepEqual(unguarded,[],'every existing authenticated elevated PL/pgSQL entrypoint is guarded');
 await db.exec(fs.readFileSync(new URL('../supabase/rollback/account_erasure_controls.sql',import.meta.url),'utf8'));
 assert.equal((await db.query("select to_regprocedure('private.conta_disponivel()') f")).rows[0].f,null);
 await asUser(B);assert.ok((await db.query("select public.pagina_app('registros_relato',null,'{}') data")).rows[0].data.rows.length>=1,'rollback preserves original list RPC and RLS');
 await db.exec('reset role');
 await db.exec(fs.readFileSync(new URL('../supabase/rollback/catalog_job_jitter.sql',import.meta.url),'utf8'));
 assert.ok(!(await db.query("select pg_get_functiondef('private.finalizar_catalogo_job(uuid,integer,text)'::regprocedure) definition")).rows[0].definition.includes('floor(random()*60)'));
 console.log('Erasure migration rollback passed; completed erasure data is intentionally not restored.');
 console.log('System database passed: service-only erasure, concurrent lease, restrictive existing-policy composition, Storage write block, atomic Auth cascade/anonymized receipt, preserved second account, original cursor RPC behavior and stale uid rejection. Auth/Storage transports are not real staging.');
}finally{await db.close();}
