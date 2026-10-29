import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
const require = createRequire(import.meta.url);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
function load(file, mocks = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  new Function('require','module','exports',code)(name => name in mocks ? mocks[name] : name === 'react' ? React : name === 'react/jsx-runtime' ? require(name) : (() => { throw Error('Unmocked import ' + name); })(),module,module.exports);
  return module.exports;
}
const calls = [];
let result = { data: [], error: null };
const query = () => {
  const chain = {};
  for (const method of ['select','order','eq','range','maybeSingle','single','delete','update','upsert']) chain[method] = (...args) => { calls.push([method,...args]); return chain; };
  chain.then = (resolve,reject) => Promise.resolve(result).then(resolve,reject);
  return chain;
};
const db = { from: table => { calls.push(['from',table]); return query(); }, rpc: async (name,args) => { calls.push(['rpc',name,args]); return result; } };
const backend = { requireBackend: () => db };
const pagination = load('../lib/pagination.ts');
const pageService = load('../services/pagination.ts', { '../lib/supabase': backend, '../lib/pagination': pagination });
const reviews = load('../services/reviews.ts', { '../lib/supabase': backend, './pagination': pageService, '../lib/pagination': pagination });
result = { data: { rows: [], nextCursor: null }, error: null };
await reviews.listOwnReviews('owner',null);
assert.deepEqual(calls[0], ['rpc','pagina_app',{p_lista:'avaliacoes',p_cursor:null,p_filtros:{}}]);
result = { data: null, error: null };
await assert.rejects(reviews.removeOwnReview('review','owner'), /indisponível/);
result = { data: null, error: Error('RLS denied') };
await assert.rejects(reviews.readOwnReview('place','owner'), /RLS denied/);
result = { data: [], error: null };
calls.length = 0;await reviews.listReviewFactors();
assert.deepEqual(calls[0], ['from','fatores']);assert.ok(calls.some(call => call[0] === 'order' && call[1] === 'ordem'));
await reviews.saveReview('place','Segura',' comment ',['factor']);
assert.deepEqual(calls.at(-1), ['rpc','salvar_avaliacao',{ p_lugar:'place',p_sentimento:'Segura',p_comentario:'comment',p_fatores:['factor'] }]);

// Password verification uses an isolated client and always closes it, including failure.
let verifiedUser = 'wrong', appUpdates = 0, checkerClosed = 0, recoveryUpdates = 0;
const authDb = { auth: {
  getSession:async()=>({data:{session:null},error:null}),
  updateUser: async () => { appUpdates++;return { error:null }; },
  signOut: async args => { assert.equal(args.scope,'local');return {error:null}; },
} };
const checker = { auth: {
  signInWithPassword: async () => ({ data:{user:{id:verifiedUser}},error:null }),
  signOut: async args => { assert.equal(args.scope,'local');checkerClosed++;return {error:null}; },
  verifyOtp: async () => ({ data:{session:{}},error:null }),
  updateUser: async () => { recoveryUpdates++;return {error:null}; },
} };
const account = load('../services/account.ts', { '../lib/publicOffline':{publicOfflineStore:{clear:async()=>{}}},'../lib/supabase':{requireBackend:()=>authDb},'../lib/account':{createRecoveryClient:()=>checker},'./push':{disablePush:async()=>{}} });
await assert.rejects(account.changePassword('owner','email','old','new'), /Conta diferente/);
assert.equal(appUpdates,0);assert.equal(checkerClosed,1);
verifiedUser='owner';await account.changePassword('owner','email','old','new');assert.equal(appUpdates,1);assert.equal(checkerClosed,2);
const recovery=account.createPasswordRecovery();await recovery.verify('email','123456');await recovery.change('new-password');await recovery.close();
assert.equal(recoveryUpdates,1);assert.equal(appUpdates,1,'recovery must never update or sign into the ordinary app client');

// Sheet exit is retained until animation completion, and reopening cancels a stale exit.
let reduced=false, state, renderer;const animations=[];
class Value { constructor(value){this.value=value;} setValue(value){this.value=value;} }
const {useSheetTransition}=load('../hooks/useSheetTransition.ts',{
  './useReducedMotion':{useReducedMotion:()=>reduced},
  'react-native':{Platform:{OS:'ios'},Easing:{out:x=>x,cubic:x=>x},Animated:{Value,timing:(value,config)=>{const entry={config,stopped:false,start(callback){entry.finish=()=>{value.value=config.toValue;callback?.({finished:true});};if(config.duration===0)entry.finish();},stop(){entry.stopped=true;}};animations.push(entry);return entry;}}},
});
function Probe({visible}){state=useSheetTransition(visible);return null;}
try {
 await act(async()=>{renderer=TestRenderer.create(React.createElement(Probe,{visible:true}));});
 assert.equal(state.present,true);assert.equal(animations.at(-1).config.duration,280);
 await act(async()=>animations.at(-1).finish());
 await act(async()=>renderer.update(React.createElement(Probe,{visible:false})));
 const staleExit=animations.at(-1);assert.equal(state.present,true,'retain sheet during exit');
 await act(async()=>renderer.update(React.createElement(Probe,{visible:true})));
 assert.equal(staleExit.stopped,true);await act(async()=>staleExit.finish());assert.equal(state.present,true,'stale exit cannot hide a reopened sheet');
 await act(async()=>renderer.update(React.createElement(Probe,{visible:false})));
 await act(async()=>animations.at(-1).finish());assert.equal(state.present,false);
 reduced=true;await act(async()=>renderer.update(React.createElement(Probe,{visible:true})));
 assert.equal(animations.at(-1).config.duration,0);
 await act(async()=>renderer.update(React.createElement(Probe,{visible:false})));
 assert.equal(state.present,false);await act(async()=>renderer.unmount());
 console.log('Architecture checks passed: review ownership/pagination/errors, lazy factor query, safe review writes, isolated password verification/recovery, retained sheet exit, interrupted reopen and reduced motion.');
} finally {console.error=originalError;}
