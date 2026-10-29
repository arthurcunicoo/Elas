import assert from 'node:assert/strict';
import fs from 'node:fs';
import {systemTestDatabase} from '../scripts/system-test-database.mjs';
import {prepareBatch,runIngestion,sha256} from '../supabase/functions/catalog-refresh/ingestion.ts';

const db=await systemTestDatabase(),events=[];
const bounds={south:-28.69,north:-28.67,west:-49.38,east:-49.36};
const area={id:'criciuma',nome:'Criciúma',estado:'SC'};
let tile;
const snapshot=async(elements,time=new Date().toISOString())=>{
 const content=JSON.stringify({elements}),hash=await sha256(content);
 return {provider:'osm',license:'ODbL',attribution:'© OpenStreetMap contributors',collectedAt:time,origin:'snapshot:sha256:'+hash,content,sha256:hash};
};
const point=(id,name='Library '+id)=>({type:'node',id,lat:-28.678,lon:-49.369,tags:{name,amenity:'library'}});
const candidates=async rows=>(await db.query('select public.candidatos_catalogo($1::jsonb) data',[JSON.stringify(rows)])).rows[0].data;
const commit=async(lease,batch)=>(await db.query('select public.confirmar_catalogo_ingestao($1::uuid,$2::jsonb) data',[lease,JSON.stringify(batch)])).rows[0].data;
async function reserve(){
 const lease=crypto.randomUUID();await db.query("update private.catalog_tiles set lease=$1,lease_until=clock_timestamp()+interval '2 minutes',disabled=false where id=$2",[lease,tile]);
 return {lease,bounds,area};
}
try {
 tile=(await db.query("insert into private.catalog_tiles(area_id,south,west,north,east) values('criciuma',-28.69,-49.38,-28.67,-49.36) returning id")).rows[0].id;
 await db.query("insert into public.lugares(id,nome,endereco,latitude,longitude,origem,referencia_externa,categoria,cadastro_revisao) values('osm:node:9001','Reviewed name','Reviewed address',-28.678,-49.369,'osm','node/9001','library',1)");
 const initial=await snapshot([point(9001,'Source name'),point(9002),point(9002),{...point(9003),lat:0},point(9004,'')]);
 const lease=await reserve(),batch=await prepareBatch(initial,lease,{candidates});
 assert.deepEqual([batch.received,batch.rejected,batch.discarded,batch.rows.length],[5,2,1,2]);
 const result=await commit(lease.lease,batch);
 assert.deepEqual(result,{created:1,updated:0,unchanged:1,manualPreserved:1,received:5,rejected:2,discarded:1});
 assert.equal((await db.query("select nome from public.lugares where id='osm:node:9001'")).rows[0].nome,'Reviewed name');
 assert.equal((await db.query('select lease from private.catalog_tiles where id=$1',[tile])).rows[0].lease,null);
 const replay=await Promise.all(Array.from({length:4},()=>commit(lease.lease,batch)));
 assert.ok(replay.every(x=>JSON.stringify(x)===JSON.stringify(result)));
 assert.equal((await db.query('select count(*)::int n from private.catalog_ingest_receipts')).rows[0].n,1);
 const changed=structuredClone(batch);changed.rows[0].nome='different content';
 await assert.rejects(commit(lease.lease,changed),e=>e.code==='22023');
 events.push({test:'atomic-success-and-replay',...result,parallelIntents:4,receiptRows:1,note:'PGlite serializes transactions; not independent connection load.'});

 const oldLease=await reserve(),currentLease=await reserve();
 await assert.rejects(commit(oldLease.lease,batch),e=>e.code==='40001');
 assert.equal((await db.query('select lease from private.catalog_tiles where id=$1',[tile])).rows[0].lease,currentLease.lease);
 await db.query("update private.catalog_tiles set lease_until=clock_timestamp()-interval '1 second' where id=$1",[tile]);
 await assert.rejects(commit(currentLease.lease,batch),e=>e.code==='40001');
 events.push({test:'replaced-or-expired-lease-cannot-write',passed:true});

 const lease2=await reserve(),valid=await prepareBatch(await snapshot([point(9010),point(9011)]),lease2,{candidates});
 const invalid=structuredClone(valid);invalid.rows[1].latitude=0;
 await assert.rejects(commit(lease2.lease,invalid),e=>e.code==='22023');
 assert.equal((await db.query("select count(*)::int n from public.lugares where id in ('osm:node:9010','osm:node:9011')")).rows[0].n,0);
 assert.equal((await db.query("select count(*)::int n from public.lugares_fontes where referencia in ('node/9010','node/9011')")).rows[0].n,0);
 assert.equal((await db.query('select lease from private.catalog_tiles where id=$1',[tile])).rows[0].lease,lease2.lease);
 events.push({test:'invalid-second-row-rolls-back-first-row-and-provenance',passed:true});

 await db.exec(`create function private.fixture_queue_failure() returns trigger language plpgsql as $$begin if new.lease is null and old.lease is not null then raise exception 'fixture queue failure';end if;return new;end$$;
 create trigger fixture_queue_failure before update on private.catalog_tiles for each row execute function private.fixture_queue_failure();`);
 await assert.rejects(commit(lease2.lease,valid),e=>e.code==='P0001');
 assert.equal((await db.query("select count(*)::int n from public.lugares where id='osm:node:9010'")).rows[0].n,0);
 assert.equal((await db.query('select count(*)::int n from private.catalog_ingest_receipts where lease=$1',[lease2.lease])).rows[0].n,0);
 await db.exec('drop trigger fixture_queue_failure on private.catalog_tiles;drop function private.fixture_queue_failure()');
 events.push({test:'queue-ACK-failure-rolls-back-catalog-and-receipt',passed:true});

 const source={collect:async()=>initial};let failures=0;
 const store={candidates,commit:async(l,b)=>{await commit(l,b);throw new TypeError('simulated lost ACK');},fail:async()=>failures++};
 const ackLease=await reserve();const uncertain=await runIngestion(source,ackLease,store,e=>events.push(e));
 assert.equal(uncertain.status,'commit_uncertain');assert.equal(failures,0,'unknown commit must not blindly reschedule an already successful job');
 const retryBatch=await prepareBatch(initial,ackLease,{candidates});
 const acknowledged=await commit(ackLease.lease,retryBatch);assert.equal(acknowledged.created,0);
 events.push({test:'lost-network-ACK-recovers-through-identical-receipt',passed:true});
 let firstAck=true;
 const singleLostAck=await reserve();
 const replayed=await runIngestion(source,singleLostAck,{candidates,commit:async(l,b)=>{const result=await commit(l,b);if(firstAck){firstAck=false;throw TypeError('lost ACK once');}return result;},fail:async()=>assert.fail('a replayed receipt must not reschedule failure')});
 assert.equal(replayed.status,'committed');
 events.push({test:'one-lost-ACK-replayed-in-handler-without-duplicate-write',passed:true});
 const rejectedLease=await reserve();let rejectionRecorded=false;
 const rejected=await runIngestion(source,rejectedLease,{candidates,commit:async()=>{throw Object.assign(Error('private validation details'),{code:'22023'});},fail:async(l,n,c)=>{rejectionRecorded=true;await db.query('select public.finalizar_catalogo_job($1,$2,$3)',[l,n,c]);}},e=>events.push(e));
 assert.equal(rejected.status,'commit_rejected');assert.equal(rejectionRecorded,true);
 assert.ok(!JSON.stringify(events).includes('private validation details'));
 events.push({test:'definite-database-rejection-is-distinct-from-lost-ACK',passed:true});

 const stale=await reserve(),older=await snapshot([point(9002,'Old source')],new Date(Date.parse(initial.collectedAt)-10000).toISOString());
 await assert.rejects(commit(stale.lease,await prepareBatch(older,stale,{candidates})),e=>e.code==='40001');
 const badHash={...initial,sha256:'0'.repeat(64)};await assert.rejects(prepareBatch(badHash,stale,{candidates}),/integrity/);
 await assert.rejects(prepareBatch({...initial,license:'unknown'},stale,{candidates}),/policy/);
 await assert.rejects(prepareBatch({...initial,collectedAt:'2026-10-25T12:00:00'},stale,{candidates}),/integrity/);
 events.push({test:'stale-snapshot-integrity-license-and-timezone-guards',passed:true});
 await db.query("insert into public.lugares(id,nome,endereco,latitude,longitude,origem,referencia_externa,atualizado_em) values('osm:node:9020','Latest legacy value','Centro',-28.678,-49.369,'osm','node/9020',clock_timestamp())");
 const legacyLease=await reserve(),legacySnapshot=await snapshot([point(9020,'Old snapshot')],new Date(Date.now()-10000).toISOString());
 await assert.rejects(commit(legacyLease.lease,await prepareBatch(legacySnapshot,legacyLease,{candidates})),e=>e.code==='40001');
 assert.equal((await db.query("select nome from public.lugares where id='osm:node:9020'")).rows[0].nome,'Latest legacy value');
 events.push({test:'older-snapshot-cannot-overwrite-dated-legacy-row-without-new-provenance',passed:true});

 const quotaLease=await reserve();let code;
 const quota=await runIngestion({collect:async()=>{throw Object.assign(Error('private transport body must not be logged'),{status:406});}},quotaLease,{candidates,commit,fail:async(l,n,c)=>{code=c;await db.query('select public.finalizar_catalogo_job($1,$2,$3)',[l,n,c]);}},e=>events.push(e));
 assert.equal(quota.status,'retry_scheduled');assert.equal(code,'source_http_406');
 assert.ok(!JSON.stringify(events).includes('private transport body'));
 const recovery=await reserve();const recovered=await runIngestion({collect:async()=>initial},recovery,{candidates,commit,fail:async()=>assert.fail('recovery must not fail')},e=>events.push(e));
 assert.equal(recovered.status,'committed');assert.equal(recovered.counts.created,0);
 events.push({test:'406-outage-preserves-data-and-reviewed-snapshot-replays-without-duplicates',passed:true,source:'fixture snapshot, not live Overpass'});
 await db.exec("insert into private.catalog_ingest_receipts(lease,batch_hash,counts,created_at) select gen_random_uuid(),repeat('a',64),'{}'::jsonb,now()-interval '8 days' from generate_series(1,250)");
 const cleanupLease=await reserve();await commit(cleanupLease.lease,retryBatch);
 assert.equal((await db.query("select count(*)::int n from private.catalog_ingest_receipts where created_at<now()-interval '7 days'")).rows[0].n,150);
 events.push({test:'receipt-retention-removes-at-most-100-expired-items-per-commit',passed:true});

 for(const role of ['anon','authenticated']){
  await db.exec('set role '+role);await assert.rejects(commit(recovery.lease,retryBatch),e=>e.code==='42501');await db.exec('reset role');
 }
 await db.exec('set role service_role');assert.ok(await commit(recovery.lease,retryBatch));await db.exec('reset role');
 const grants=(await db.query("select has_table_privilege('anon','private.catalog_ingest_receipts','select') a,has_table_privilege('authenticated','private.catalog_ingest_receipts','select') u,has_table_privilege('service_role','private.catalog_ingest_receipts','select') s")).rows[0];
 assert.deepEqual(grants,{a:false,u:false,s:false});
 events.push({test:'machine-only-API-and-no-direct-receipt-grants',passed:true});
 await db.exec(fs.readFileSync('supabase/rollback/atomic_catalog_ingestion.sql','utf8'));
 assert.equal((await db.query("select to_regprocedure('public.confirmar_catalogo_ingestao(uuid,jsonb)') f")).rows[0].f,null);
 assert.equal((await db.query("select count(*)::int n from public.lugares where id in ('osm:node:9001','osm:node:9002')")).rows[0].n,2);
 events.push({test:'rollback-removes-API-and-preserves-imported-data',passed:true});
 const report={scope:'Isolated real PostgreSQL/PGlite and production parsers; source/transport/clock/ACK failures injected; not staging or device/load evidence',events,passed:true};
 if(process.env.EXCEPTIONAL_EVIDENCE)fs.writeFileSync(process.env.EXCEPTIONAL_EVIDENCE,JSON.stringify(report,null,2)+'\n');
 console.log(JSON.stringify(report));
}finally{await db.close();}
