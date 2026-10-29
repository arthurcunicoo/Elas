import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalError=console.error;console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
function load(file,mocks={}){const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;new Function('require','module','exports','setTimeout','clearTimeout',code)(name=>name==='react'?React:name==='react/jsx-runtime'?require(name):name in mocks?mocks[name]:(()=>{throw Error('Unmocked '+name);})(),module,module.exports,schedule,clear);return module.exports;}
let timerId=0;const timers=new Map();const schedule=(fn)=>{const id=++timerId;timers.set(id,fn);return id;},clear=id=>timers.delete(id);
const flush=async()=>{const work=[...timers.values()];timers.clear();await act(async()=>work.forEach(fn=>fn()));};
const cursor=n=>({v:1,scope:'a'.repeat(32),at:'2026-10-20T10:00:00.123456+00:00',key:'2020-01-01T00:00:00.123456+00:00',id:String(n)});
const row=n=>({id:String(n)}),page=(rows,nextCursor=null)=>({rows,nextCursor});
let account='a',list,renderer;const requests=[];
const loader=c=>new Promise((resolve,reject)=>requests.push({cursor:c,resolve,reject}));
const {usePagedList}=load('../features/profile/usePagedList.ts',{'expo-router':{useFocusEffect:effect=>React.useEffect(effect,[effect])},'../../lib/supabase':{friendlyError:e=>e.message},'../auth/SessionProvider':{useSession:()=>({session:{user:{id:account}}})}});
function ListProbe({scope=''}){list=usePagedList(loader,scope);return null;}
try{
 await act(async()=>{renderer=TestRenderer.create(React.createElement(ListProbe));});assert.equal(requests[0].cursor,null);
 await act(async()=>requests[0].resolve(page([row(1),row(2)],cursor(2))));assert.equal(list.hasMore,true,'cursor controls continuation, not array length');
 await act(async()=>{list.more();list.more();});assert.equal(requests.length,2,'double tap shares the in-flight operation');
 assert.deepEqual(requests[1].cursor,cursor(2));
 await act(async()=>requests[1].reject(Error('offline')));assert.equal(list.error,'offline');assert.equal(list.rows.length,2);
 await act(async()=>list.more());assert.deepEqual(requests[2].cursor,cursor(2),'failure must not advance the cursor');
 await act(async()=>requests[2].resolve(page([row(2),row(3)],cursor(3))));assert.deepEqual(list.rows.map(r=>r.id),['1','2','3'],'defensive merge removes repeated IDs');
 await act(async()=>list.more());await act(async()=>list.refresh());assert.equal(requests[4].cursor,null);
 await act(async()=>requests[3].resolve(page([row(4)],cursor(4))));assert.deepEqual(list.rows.map(r=>r.id),['1','2','3'],'refresh preserves visible rows and rejects stale continuation');
 await act(async()=>requests[4].resolve(page([row(10)])));assert.equal(list.hasMore,false);await act(async()=>list.more());assert.equal(requests.length,5);
 await act(async()=>{list.refresh();list.refresh();});assert.equal(requests.length,6,'duplicate refreshes share one operation');account='b';await act(async()=>renderer.update(React.createElement(ListProbe)));
 await act(async()=>requests[5].resolve(page([row(99)],cursor(99))));assert.equal(list.rows.length,0,'old account response stays hidden');
 await act(async()=>requests[6].resolve(page([row(20)],cursor(20))));assert.equal(list.rows[0].id,'20');
 await act(async()=>renderer.update(React.createElement(ListProbe,{scope:'other-filter'})));assert.equal(requests.at(-1).cursor,null,'filter reset starts at the beginning');
 await act(async()=>requests.at(-1).reject(Error('filter offline')));
 const beforeMore=requests.length;await act(async()=>list.more());assert.equal(requests.length,beforeMore,'failed first page cannot reuse prior-account/filter cursor');
 await act(async()=>list.refresh());await act(async()=>requests.at(-1).resolve(page([row(30)],cursor(30))));
 await act(async()=>list.refresh());await act(async()=>requests.at(-1).reject(Error('offline')));assert.equal(list.rows[0].id,'30');
 await act(async()=>list.more());assert.deepEqual(requests.at(-1).cursor,cursor(30),'same-scope refresh failure preserves continuation');
 await act(async()=>requests.at(-1).resolve(page([])));await act(async()=>renderer.unmount());

 const searches=[];let search;account='a';
 const {usePlaceSearch}=load('../features/map/usePlaceSearch.ts',{'../auth/SessionProvider':{useSession:()=>({session:{user:{id:account}}})},'../../services/places':{searchImportedPlaces:(query,category,c,signal)=>new Promise((resolve,reject)=>searches.push({query,category,cursor:c,signal,resolve,reject}))},'../../lib/supabase':{friendlyError:e=>e.message}});
 function SearchProbe({query='old',category='all',enabled=true}){search=usePlaceSearch(query,category,enabled);return null;}
 await act(async()=>{renderer=TestRenderer.create(React.createElement(SearchProbe));});assert.equal(searches.length,0);await flush();
 await act(async()=>searches[0].resolve(page([row(1)],cursor(1))));await act(async()=>{search.more();search.more();});assert.equal(searches.length,2);
 await act(async()=>searches[1].reject(Error('offline')));await act(async()=>search.retry());assert.deepEqual(searches[2].cursor,cursor(1));
 await act(async()=>renderer.update(React.createElement(SearchProbe,{query:'new',category:'cafes'})));assert.equal(search.rows.length,0);assert.equal(searches[2].signal.aborted,true,'changing search must cancel the previous request');await flush();assert.equal(searches[3].cursor,null);assert.equal(searches[3].category,'cafes');
 await act(async()=>searches[2].resolve(page([row(9)],cursor(9))));assert.equal(search.rows.length,0);
 await act(async()=>searches[3].resolve(page([row(30)])));assert.equal(search.rows[0].id,'30');assert.equal(search.hasMore,false);
 await act(async()=>renderer.update(React.createElement(SearchProbe,{enabled:false})));assert.equal(search.rows.length,0);assert.equal(search.loading,false);await act(async()=>renderer.unmount());
 const {parsePage}=load('../lib/pagination.ts');for(const bad of [null,{rows:[]},page([row(1),row(1)]),page([],cursor(1)),page(Array.from({length:21},(_,i)=>row(i)))])assert.throws(()=>parsePage(bad));
 assert.deepEqual(parsePage(page([row(1)],cursor(1))).nextCursor,cursor(1),'timestamp text is preserved verbatim');
 console.log('Cursor UI checks passed: exact retry cursor, double tap lock, deduplication, refresh/account/filter races, debounce, disabled search, malformed payload rejection and microsecond preservation.');
}finally{console.error=originalError;}
