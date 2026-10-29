import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { createProtectedStore } from '../lib/storage/protectedStore.ts';
import { createErasureHandler } from '../supabase/functions/account-erasure/worker.ts';
import { selectedServiceArea,selectServiceArea,subscribeServiceSelection } from '../features/map/serviceSelection.ts';
import { cityInstant } from '../features/community/dates.ts';
import { eventSchedule } from '../lib/eventPresentation.ts';
const require=createRequire(import.meta.url);
const rawData=new Map(),keyData=new Map();let failWrite=false;
const raw={getItem:async k=>rawData.get(k)??null,setItem:async(k,v)=>{if(failWrite)throw Error('disk full');rawData.set(k,v);},removeItem:async k=>rawData.delete(k),getAllKeys:async()=>[...rawData.keys()]};
const codec={readKey:async k=>keyData.get(k)??null,saveKey:async(k,v)=>{keyData.set(k,v);},removeKey:async k=>{keyData.delete(k);},createKey:()=>crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']),
 seal:async(key,value,context)=>{const iv=crypto.getRandomValues(new Uint8Array(12)),body=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(value));return JSON.stringify({iv:Buffer.from(iv).toString('base64'),body:Buffer.from(body).toString('base64')});},
 open:async(key,value,context)=>{const p=JSON.parse(value);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Buffer.from(p.iv,'base64'),additionalData:new TextEncoder().encode(context)},key,Buffer.from(p.body,'base64')));}};
const protectedStore=createProtectedStore(raw,codec);
rawData.set('a:draft','private legacy report');assert.equal(await protectedStore.getItem('a:draft'),'private legacy report');assert.ok(!rawData.get('a:draft').includes('private legacy'));
const first=rawData.get('a:draft');await protectedStore.setItem('a:draft','private legacy report');assert.notEqual(rawData.get('a:draft'),first,'unique random nonce per write');
await protectedStore.setItem('a:session','token'.repeat(5000));assert.equal((await protectedStore.getItem('a:session')).length,25000);
keyData.set('b:draft',keyData.get('a:draft'));rawData.set('b:draft',rawData.get('a:draft'));await assert.rejects(protectedStore.getItem('b:draft'),'AAD binds a ciphertext to account/scope');
rawData.set('legacy-fail','recover me');failWrite=true;await assert.rejects(protectedStore.getItem('legacy-fail'));assert.equal(rawData.get('legacy-fail'),'recover me','migration failure cannot destroy legacy plaintext');failWrite=false;
await protectedStore.getItem('legacy-fail');assert.ok(!rawData.get('legacy-fail').includes('recover me'));
await protectedStore.setItem('missing-key','keep ciphertext');const missing=rawData.get('missing-key');keyData.delete('missing-key');await assert.rejects(protectedStore.getItem('missing-key'));await assert.rejects(protectedStore.setItem('missing-key','overwrite'));assert.equal(rawData.get('missing-key'),missing);
await Promise.all([protectedStore.setItem('ordered','one'),protectedStore.setItem('ordered','two'),protectedStore.removeItem('ordered')]);assert.equal(rawData.has('ordered'),false);assert.equal(keyData.has('ordered'),false);
const code=ts.transpileModule(fs.readFileSync(new URL('../lib/publicOffline.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,module={exports:{}};
new Function('require','module','exports',code)(name=>name==='@react-native-async-storage/async-storage'?{default:raw}:require(name),module,module.exports);
const offline=module.exports.createPublicOfflineStore(raw,'fixture');
await offline.save('a',[{id:'x',name:'Biblioteca',address:'Centro',latitude:1,longitude:2,description:'PRIVATE',reviewSummary:{privateComment:'SECRET'}}]);
const cache=await offline.read('a');assert.deepEqual(Object.keys(cache.rows[0]).sort(),['address','id','latitude','longitude','name']);assert.equal(await offline.read('b'),null);
assert.ok(!rawData.get('elas.public.v1:fixture:a').includes('PRIVATE'));assert.ok(!rawData.get('elas.public.v1:fixture:a').includes('SECRET'));
rawData.set('elas.public.v1:fixture:a',JSON.stringify({...cache,savedAt:new Date(Date.now()-8*86400000).toISOString()}));assert.equal(await offline.read('a'),null);
let changed=0;const off=subscribeServiceSelection(()=>changed++);selectServiceArea('A',{id:'manaus',timezone:'America/Manaus'});selectServiceArea('B',{id:'recife',timezone:'America/Recife'});assert.equal(selectedServiceArea('A').timezone,'America/Manaus');assert.equal(changed,2);off();
const instant=cityInstant('2026-11-01','23:30',selectedServiceArea('A').timezone);assert.equal(instant,'2026-11-02T03:30:00.000Z');assert.equal(eventSchedule(instant,'','America/Manaus').day,'01');assert.equal(eventSchedule(instant,'','America/Recife').day,'02');
let calls=[],authenticated=true,password=true,lease='lease',storageFails=false;
const handler=createErasureHandler({authenticate:async()=>authenticated?{id:'A',email:'a@fixture.invalid'}:null,verifyPassword:async()=>password,begin:async id=>{calls.push(['begin',id]);return lease;},revoke:async()=>calls.push(['revoke']),removeAvatars:async id=>{calls.push(['avatars',id]);if(storageFails)throw Error();},erase:async id=>calls.push(['erase',id])});
const request=(body={password:'current',confirmation:'EXCLUIR',userId:'VICTIM'})=>new Request('https://fixture.invalid',{method:'POST',headers:{Authorization:'Bearer fixture'},body:JSON.stringify(body)});
authenticated=false;assert.equal((await handler(request())).status,401);assert.equal(calls.length,0);authenticated=true;password=false;assert.equal((await handler(request())).status,403);assert.equal(calls.length,0);password=true;
assert.equal((await handler(request({password:'current',confirmation:'wrong'}))).status,400);assert.equal(calls.length,0);
lease=null;assert.equal((await handler(request())).status,409);assert.ok(!calls.some(c=>c[0]==='erase'));lease='lease';calls=[];storageFails=true;assert.equal((await handler(request())).status,503);assert.ok(!calls.some(c=>c[0]==='erase'),'Storage failure must preserve Auth account for a retry');
storageFails=false;calls=[];assert.equal((await handler(request())).status,200);assert.deepEqual(calls,[['begin','A'],['revoke'],['avatars','A'],['erase','A']]);assert.ok(!JSON.stringify(calls).includes('VICTIM'));
// Exercise the UI service across a real async account change, without server mutation.
const erasureCode=ts.transpileModule(fs.readFileSync(new URL('../services/accountErasure.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
const previousFlag=process.env.EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED;process.env.EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED='true';
let currentOwner='A',invokeResolve,localSignouts=0;const cleared=[];
const erasureModule={exports:{}};
new Function('require','module','exports',erasureCode)(name=>({
 '../lib/publicOffline':{publicOfflineStore:{clear:async owner=>cleared.push(['offline',owner])}},
 '../features/reports/draftStorage':{clearAccountDrafts:async owner=>cleared.push(['drafts',owner])},
 '../lib/supabase':{requireBackend:()=>({auth:{getSession:async()=>({data:{session:{user:{id:currentOwner}}}}),signOut:async()=>localSignouts++},functions:{invoke:()=>new Promise(resolve=>{invokeResolve=resolve;})}})},
})[name]??require(name),erasureModule,erasureModule.exports);
try{
 const deleting=erasureModule.exports.eraseAccount('A','current','EXCLUIR');
 while(!invokeResolve)await new Promise(resolve=>setImmediate(resolve));
 currentOwner='B';invokeResolve({error:null});await deleting;
 assert.equal(localSignouts,0,'a completed deletion must not log out a newly signed-in account');
 assert.deepEqual(cleared,[['drafts','A'],['offline','A']]);
 await assert.rejects(erasureModule.exports.eraseAccount('A','current','EXCLUIR'),/conta mudou/);
}finally{if(previousFlag===undefined)delete process.env.EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED;else process.env.EXPO_PUBLIC_ACCOUNT_ERASURE_ENABLED=previousFlag;}
console.log('System security passed: real WebCrypto GCM/AAD/nonce, encrypted legacy migration/failure/large sessions/serialization/key loss, public-only offline cache TTL/account scope, selected-city timezone and erasure Auth/password/target/lease/Storage failure ordering. Native keychain and real Auth/Storage still require staging/devices.');
