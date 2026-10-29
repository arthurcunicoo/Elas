import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { cityInstant, cityDateParts } from '../features/community/dates.ts';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const original=console.error;console.error=(...a)=>{if(!String(a[0]).includes('react-test-renderer is deprecated'))original(...a);};
function load(file,mocks={},timers={setTimeout,clearTimeout}) {
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports','setTimeout','clearTimeout',code)(name=>name==='react'?React:name==='react/jsx-runtime'?require(name):name in mocks?mocks[name]:(()=>{throw Error('Unmocked '+name);})(),module,module.exports,timers.setTimeout,timers.clearTimeout);return module.exports;
}
async function drafts(file) {
 const data=new Map(),timers=new Map(),listeners=new Set();let timerId=0,uuid=0,writes=0,account='a',draft,renderer;
 const clock={setTimeout:fn=>{timers.set(++timerId,fn);return timerId;},clearTimeout:id=>timers.delete(id)};
 const storage={getItem:async key=>data.get(key)??null,setItem:async(key,value)=>{writes++;data.set(key,value);},removeItem:async key=>data.delete(key),getAllKeys:async()=>[...data.keys()]};
 const persistence=load('../features/reports/draftStorage.ts',{'@react-native-async-storage/async-storage':{default:storage},'../../lib/storage/protectedStorage':{protectedStorage:storage}},clock);
 const hooks=load(file,{'../../lib/storage/protectedStorage':{protectedStorage:storage},'@react-native-async-storage/async-storage':{default:storage},'expo-crypto':{randomUUID:()=>String(++uuid)},'../auth/SessionProvider':{useSession:()=>({session:{user:{id:account}}})},'react-native':{AppState:{addEventListener:(_,fn)=>{listeners.add(fn);return {remove:()=>listeners.delete(fn)};}}},'./draftStorage':persistence},clock);
 function Probe(){draft=hooks.useDraft('report',{text:''});return null;}
 const mount=async()=>act(async()=>{renderer=TestRenderer.create(React.createElement(Probe));});
 const tick=async()=>act(async()=>{const jobs=[...timers.values()];timers.clear();jobs.forEach(f=>f());});
 await mount();writes=0;
 for(let i=1;i<=100;i++)await act(async()=>draft.setValue({text:'x'.repeat(i)}));
 await tick();const typingWrites=writes;
 assert.equal(JSON.parse(data.get('elas:draft:v1:a:report')).value.text.length,100);
 if(file.includes('baseline')){await act(async()=>renderer.unmount());return typingWrites;}
 assert.equal(typingWrites,1);
 await act(async()=>draft.setValue({text:'flush on background'}));assert.equal(timers.size,1);
 await act(async()=>listeners.forEach(f=>f('background')));assert.equal(timers.size,0);assert.equal(JSON.parse(data.get('elas:draft:v1:a:report')).value.text,'flush on background');
 await act(async()=>draft.setValue({text:'leave screen'}));await act(async()=>renderer.unmount());assert.equal(JSON.parse(data.get('elas:draft:v1:a:report')).value.text,'leave screen');assert.equal(listeners.size,0);
 await mount();assert.equal(draft.restored,true);assert.equal(draft.value.text,'leave screen');
 let id;await act(async()=>{id=await draft.prepare({text:'send'});});assert.equal(JSON.parse(data.get('elas:draft:v1:a:report')).attempt.id,id);
 await act(async()=>{assert.equal(await draft.prepare({text:'send'}),id);});
 await act(async()=>draft.setValue({text:'must not resurrect'}));await act(async()=>draft.clear());await tick();assert.equal(data.has('elas:draft:v1:a:report'),false);
 await act(async()=>draft.setValue({text:'account A'}));account='b';await act(async()=>renderer.update(React.createElement(Probe)));assert.equal(draft.value.text,'');
 await act(async()=>draft.setValue({text:'account B'}));await tick();assert.equal(JSON.parse(data.get('elas:draft:v1:a:report')).value.text,'account A');assert.equal(JSON.parse(data.get('elas:draft:v1:b:report')).value.text,'account B');
 await act(async()=>draft.setValue({text:'pending logout'}));await act(async()=>hooks.clearAccountDrafts('b'));await act(async()=>renderer.unmount());await tick();assert.equal(data.has('elas:draft:v1:b:report'),false);assert.equal(data.has('elas:draft:v1:a:report'),true);
 account='future';data.set('elas:draft:v1:future:report',JSON.stringify({version:1,time:Date.now()+86400000,value:{text:'future'}}));await mount();assert.equal(draft.restored,false);assert.equal(data.has('elas:draft:v1:future:report'),false);await act(async()=>renderer.unmount());
 return typingWrites;
}
const before=await drafts('../qa/benchmarks/baseline/drafts.ts.txt'),after=await drafts('../features/reports/drafts.ts');
// Date conversion is independent from the host device timezone.
assert.equal(cityInstant('2026-11-01','14:30','America/Manaus'),'2026-11-01T18:30:00.000Z');
assert.equal(cityInstant('2026-11-01','14:30','Asia/Kathmandu'),'2026-11-01T08:45:00.000Z');
assert.throws(()=>cityInstant('2026-03-08','02:30','America/New_York'),/inexistente/);
assert.throws(()=>cityInstant('2026-11-01','01:30','America/New_York'),/ambíguo/);
assert.throws(()=>cityInstant('2026-02-30','12:00'));
assert.deepEqual(cityDateParts('2026-11-02T02:30:00Z','America/Manaus'),{date:'2026-11-01',time:'22:30'});
// A failed cities refresh must not erase a usable map or expose prior-account state.
let account='a',areas,renderer;const requests=[];
const {useServiceAreas}=load('../features/map/useServiceAreas.ts',{'./serviceSelection':{selectedServiceArea:()=>null,subscribeServiceSelection:()=>()=>{},selectServiceArea:()=>{}},'expo-router':{useFocusEffect:fn=>React.useEffect(fn,[fn])},'../auth/SessionProvider':{useSession:()=>({session:{user:{id:account}}})},'../../services/serviceAreas':{listServiceAreas:()=>new Promise((resolve,reject)=>requests.push({resolve,reject}))},'../../lib/supabase':{friendlyError:e=>e.message}});
function Areas(){areas=useServiceAreas();return null;}
await act(async()=>{renderer=TestRenderer.create(React.createElement(Areas));});await act(async()=>requests[0].resolve([{id:'city'}]));
await act(async()=>areas.retry());await act(async()=>requests[1].reject(Error('offline')));assert.equal(areas.area.id,'city');assert.equal(areas.error,'offline');
account='b';await act(async()=>renderer.update(React.createElement(Areas)));assert.equal(areas.area,undefined);await act(async()=>requests[2].reject(Error('offline')));assert.equal(areas.area,undefined);await act(async()=>renderer.unmount());
console.error=original;
console.log(JSON.stringify({test:'100 sequential text edits followed by debounce flush',baselineStorageWrites:before,currentStorageWrites:after,environment:'React test renderer, simulated AsyncStorage/timers; not device latency'}));
console.log('Modernization: drafts/debounce/background/unmount/restore/idempotency/clear/account isolation/future dates, IANA/DST dates and offline service-area retention passed.');
// Leaving a form waits for persistence; a storage failure requires explicit discard.
let onRemove,dispatches=0,resolveSave,rejectSave,guardRenderer;
const navigation={dispatch:()=>dispatches++};
const {DraftGuard}=load('../components/DraftGuard.tsx',{'@react-navigation/native':{useNavigation:()=>navigation,usePreventRemove:(_enabled,fn)=>{onRemove=fn;}},'./ProfileDialog':{ProfileDialog:props=>React.createElement('Dialog',props)}});
await act(async()=>{guardRenderer=TestRenderer.create(React.createElement(DraftGuard,{enabled:true,onSave:()=>new Promise((resolve,reject)=>{resolveSave=resolve;rejectSave=reject;})}));});
await act(async()=>onRemove({data:{action:{type:'BACK'}}}));
await act(async()=>guardRenderer.root.findByType('Dialog').props.notice.confirm());assert.equal(dispatches,0);
await act(async()=>resolveSave());assert.equal(dispatches,1);
await act(async()=>onRemove({data:{action:{type:'BACK'}}}));await act(async()=>guardRenderer.root.findByType('Dialog').props.notice.confirm());await act(async()=>rejectSave(Error('disk full')));
assert.equal(dispatches,1);assert.equal(guardRenderer.root.findByType('Dialog').props.notice.confirmLabel,'Sair sem salvar');await act(async()=>guardRenderer.unmount());
console.log('Draft navigation waits for durable save and exposes explicit discard after failure.');
