import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { createClient } from '@supabase/supabase-js';
import { deadlineFetch } from '../lib/request.ts';
import { RegionRequestCache } from '../features/map/cache.ts';
// Request objects carry their own signal. Wrapping fetch must preserve it too.
{
 const owner=new AbortController(),request=new Request('https://fixture.invalid',{signal:owner.signal});
 let received;
 const wrapped=deadlineFetch((_input,init)=>new Promise((_resolve,reject)=>{
  received=init.signal;const stop=()=>reject(received.reason);if(received.aborted)stop();else received.addEventListener('abort',stop,{once:true});
 }));
 const pending=wrapped(request),rejected=assert.rejects(pending);owner.abort();await rejected;
 assert.equal(received.aborted,true,'the original Request.signal must reach wrapped fetch');
 const override=new AbortController(),fallback=new AbortController();fallback.abort();
 const ok=deadlineFetch(async(_input,init)=>{assert.equal(init.signal.aborted,false);return new Response('ok');});
 await ok(new Request('https://fixture.invalid',{signal:fallback.signal}),{signal:override.signal});
 await ok(new Request('https://fixture.invalid',{signal:fallback.signal}),{signal:null});
}
const requests=[];
const fetcher=(input,init)=>new Promise((resolve,reject)=>{
 const record={url:String(input),signal:init.signal,resolve:body=>resolve(new Response(JSON.stringify(body),{headers:{'Content-Type':'application/json'}}))};requests.push(record);
 const cancel=()=>{const error=new Error('fetch aborted');error.name='AbortError';reject(error);};
 if(init.signal.aborted)cancel();else init.signal.addEventListener('abort',cancel,{once:true});
});
const client=createClient('https://fixture.supabase.invalid','fixture-public-key',{accessToken:async()=> 'fixture-user',global:{fetch:deadlineFetch(fetcher)},auth:{persistSession:false,autoRefreshToken:false}});
const root=path.resolve(import.meta.dirname,'..'),cache=new Map();
function load(relative){if(relative==='lib/supabase.ts')return {requireBackend:()=>client,supabase:client};if(cache.has(relative))return cache.get(relative).exports;
 const filename=path.join(root,relative),module={exports:{}};cache.set(relative,module);
 const source=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',source)(name=>{assert.ok(name.startsWith('.'),name);const base=path.resolve(path.dirname(filename),name),candidate=[base,base+'.ts'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());return load(path.relative(root,candidate));},module,module.exports);return module.exports;
}
const places=load('services/places.ts'),reports=load('services/reports.ts'),community=load('services/communityReviews.ts'),pages=load('services/pagination.ts');
const region={latitude:-28.68,longitude:-49.37,latitudeDelta:.02,longitudeDelta:.02};
const settle=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
for(const operation of [signal=>places.nearbyPlaces(region,'all',signal),signal=>places.searchImportedPlaces('praça','all',null,signal),signal=>places.resolvePlace('fixture',signal),signal=>reports.mapReports(region,15,signal),signal=>reports.findReport('fixture',signal),signal=>community.hydrateCommunity([{id:'fixture'}],signal),signal=>pages.cursorPage('eventos',null,{},signal)]) {
 const controller=new AbortController(),before=requests.length;
 const pending=operation(controller.signal);const rejection=assert.rejects(pending,error=>String(error.message).includes('abort'));
 await settle();assert.equal(requests.length,before+1,'the real SDK must start one read');assert.equal(requests.at(-1).signal.aborted,false);
 controller.abort();await rejection;assert.equal(requests.at(-1).signal.aborted,true,'cancellation must reach fetch, not merely suppress a state update');
}
// A search cancelled during its second read must also cancel the review summary.
const controller=new AbortController(),pendingSearch=places.searchImportedPlaces('praça','all',null,controller.signal);const rejectedSearch=assert.rejects(pendingSearch);
await settle();requests.at(-1).resolve({rows:[{id:'fixture',nome:'Praça',endereco:'Centro',latitude:-28.68,longitude:-49.37}],nextCursor:null});await settle();assert.ok(requests.at(-1).url.endsWith('/rpc/resumos_avaliacoes'));controller.abort();await rejectedSearch;assert.equal(requests.at(-1).signal.aborted,true);
// Consumers share a network request; one leaving cannot cancel the other.
const regionCache=new RegionRequestCache(),one=new AbortController(),two=new AbortController();
const first=regionCache.run('same',signal=>places.nearbyPlaces(region,'all',signal),false,Date.now(),one.signal);
const firstRejected=assert.rejects(first,{name:'AbortError'});
const second=regionCache.run('same',()=>{throw Error('must share');},false,Date.now(),two.signal);
await settle();const shared=requests.at(-1);one.abort();await firstRejected;assert.equal(shared.signal.aborted,false);shared.resolve({places:[],warning:'',refreshing:false});assert.deepEqual((await second).places,[]);
// The last consumer leaving aborts and removes the pending cache entry, so retry is fresh.
const last=new AbortController(),abandoned=regionCache.run('other',signal=>places.nearbyPlaces(region,'all',signal),false,Date.now(),last.signal);const abandonedRejected=assert.rejects(abandoned,{name:'AbortError'});await settle();const cancelled=requests.at(-1);last.abort();await abandonedRejected;assert.equal(cancelled.signal.aborted,true);
const retry=regionCache.run('other',signal=>places.nearbyPlaces(region,'all',signal));await settle();assert.notEqual(requests.at(-1),cancelled);requests.at(-1).resolve({places:[],warning:'',refreshing:false});await retry;
const cleanup=regionCache.run('cleanup',signal=>places.nearbyPlaces(region,'all',signal));const cleanupRejected=assert.rejects(cleanup);await settle();regionCache.clear();await cleanupRejected;assert.equal(requests.at(-1).signal.aborted,true);
// Existing optimized event contract needs exactly one RPC, with registration included.
const events=load('features/community/community.ts'),before=requests.length;const listing=events.listEvents(null);await settle();assert.equal(requests.length,before+1);requests.at(-1).resolve({rows:[{id:'event',inscrito:true}],nextCursor:null});assert.equal((await listing).rows[0].inscrito,true);
console.log('Cancellation passed with the real Supabase SDK and fetch boundary: map/search/detail/summary/page reads, chained hydration, shared consumer ownership, last-consumer abort, fresh retry, provider cleanup and one-trip events.');
