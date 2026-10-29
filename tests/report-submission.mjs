import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createRequire} from 'node:module';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {reportPayload,initialReportDraft} from '../features/reports/reportSubmission.ts';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const original=console.error;console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))original(...args);};
const requests=[];let result,renderer,clears=0;
const mod={exports:{}},code=ts.transpileModule(fs.readFileSync('features/reports/useReportSubmission.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const mocks={'react':React,'../../services/reports':{createReport:(id,payload)=>new Promise((resolve,reject)=>requests.push({id,payload,resolve,reject}))},'../../lib/supabase':{friendlyError:()=> 'Falha de conexão.'},'./reportSubmission':{reportPayload}};
new Function('require','module','exports',code)(name=>{assert.ok(name in mocks,name);return mocks[name];},mod,mod.exports);
const draft={value:{...initialReportDraft,place:'Praça',description:'Iluminação precisa melhorar.'},ready:true,prepare:async()=> 'same-attempt-id',clear:async()=>{clears++;}};
function Probe(props){result=mod.exports.useReportSubmission({draft,owner:'a',correction:false,linkedId:'place',attachLocation:false,location:{latitude:-28.67856,longitude:-49.36974},...props});return null;}
try{
 await act(async()=>{renderer=TestRenderer.create(React.createElement(Probe));});
 await act(async()=>{void result.send();void result.send();});assert.equal(requests.length,1);assert.equal(requests[0].payload.latitude,undefined);assert.equal(requests[0].payload.lugar_id,'place');
 await act(async()=>requests[0].reject(Error('offline')));assert.equal(clears,0);assert.equal(result.error,'Falha de conexão.');
 await act(async()=>{void result.send();});assert.equal(requests[1].id,requests[0].id,'retry uses the prepared idempotency attempt');
 await act(async()=>requests[1].resolve('saved'));assert.equal(clears,1);assert.equal(result.done,true);assert.equal(result.sentId,'saved');await act(async()=>renderer.unmount());
 clears=0;await act(async()=>{renderer=TestRenderer.create(React.createElement(Probe,{attachLocation:true}));});
 await act(async()=>{void result.send();});assert.equal(requests[2].payload.latitude,-28.679);assert.equal(requests[2].payload.longitude,-49.37);
 await act(async()=>renderer.unmount());await act(async()=>requests[2].resolve('saved-after-leave'));assert.equal(clears,0,'an old form cannot clear a draft reopened after leaving');
 const count=requests.length;await act(async()=>{renderer=TestRenderer.create(React.createElement(Probe,{owner:undefined}));});await act(async()=>{void result.send();});assert.equal(requests.length,count);assert.ok(result.error.includes('Entre'));await act(async()=>renderer.unmount());
 assert.throws(()=>reportPayload({...draft.value,description:'short'},{correction:false,attachLocation:false,location:null}));
 assert.throws(()=>reportPayload(draft.value,{correction:true,attachLocation:false,location:null}));
 assert.throws(()=>reportPayload(draft.value,{correction:false,attachLocation:true,location:{latitude:Infinity,longitude:0}}));
 console.log('Report submission passed: contextual validation, login required, duplicate-tap lock, retry/idempotency, retained content on error, success cleanup, coarse location opt-in and no cleanup after leaving.');
}finally{console.error=original;}
