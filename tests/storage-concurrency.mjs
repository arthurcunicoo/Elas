import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {createProtectedStore} from '../lib/storage/protectedStore.ts';
import {webStorageExclusive} from '../lib/storage/webStorageLock.ts';

const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window');
const originalNavigator=Object.getOwnPropertyDescriptor(globalThis,'navigator');
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const pending=new Map(),held=[];
const locks={request(name,task){
 const run=(pending.get(name)??Promise.resolve()).catch(()=>{}).then(async()=>{held.push(name);return task();});
 pending.set(name,run);return run;
}};
try {
 Object.defineProperty(globalThis,'window',{configurable:true,value:{}});
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks}});
 const values=new Map(),secrets=new Map();let creates=0,failWrite=false;
 const storage={getItem:async key=>values.get(key)??null,getAllKeys:async()=>[...values.keys()],setItem:async(key,value)=>{if(failWrite)throw Error('disk full');values.set(key,value);},removeItem:async key=>values.delete(key)};
 const protection={
  readKey:async key=>{const found=secrets.get(key)??null;await delay(1);return found;},
  saveKey:async(key,value)=>{secrets.set(key,value);},removeKey:async key=>secrets.delete(key),
  createKey:async()=>{creates++;return crypto.subtle.generateKey({name:'AES-GCM',length:256},false,['encrypt','decrypt']);},
  seal:async(key,value,context)=>{
   if(value==='first')await delay(25);
   const iv=crypto.getRandomValues(new Uint8Array(12)),body=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(context)},key,new TextEncoder().encode(value));
   return JSON.stringify({iv:Array.from(iv),body:Array.from(new Uint8Array(body))});
  },
  open:async(key,value,context)=>{const sealed=JSON.parse(value);return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:Uint8Array.from(sealed.iv),additionalData:new TextEncoder().encode(context)},key,Uint8Array.from(sealed.body)));},
 };
 // Two stores represent independent tabs: only the origin lock broker is shared.
 const a=createProtectedStore(storage,protection,{exclusive:webStorageExclusive});
 const b=createProtectedStore(storage,protection,{exclusive:webStorageExclusive});
 await Promise.all([a.setItem('account-a:session','first'),b.setItem('account-a:session','second')]);
 assert.equal(await a.getItem('account-a:session'),'second');
 assert.equal(creates,1,'tabs must not race to overwrite a shared encryption key');
 assert.ok(!values.get('account-a:session').includes('second'));
 await Promise.all([a.setItem('account-a:session','first'),b.removeItem('account-a:session')]);
 assert.equal(await a.getItem('account-a:session'),null);
 assert.equal(secrets.has('account-a:session'),false,'delete must not race with a writer that recreates ciphertext');
 values.set('legacy','recover');failWrite=true;
 await assert.rejects(a.getItem('legacy'),/disk full/);assert.equal(values.get('legacy'),'recover');
 failWrite=false;assert.equal(await b.getItem('legacy'),'recover','failed operation releases the cross-context lock');
 await a.setItem('account-b:draft','other account');await a.removeItem('legacy');
 assert.equal(await b.getItem('account-b:draft'),'other account');
 assert.ok(held.includes('elas.protected.v1:account-a:session'));

 // Load the real web adapter to verify it opts into the tested cross-tab lock.
 const code=ts.transpileModule(fs.readFileSync(new URL('../lib/storage/protectedStorage.web.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
 let wired=false;const module={exports:{}};
 new Function('require','module','exports',code)(name=>({
  '@react-native-async-storage/async-storage':{default:storage},
  './protectedStore':{createProtectedStore:(raw,codec,options)=>{wired=options?.exclusive===webStorageExclusive;return createProtectedStore(raw,codec,options);}},
  './webStorageLock':{webStorageExclusive},
 })[name],module,module.exports);
 assert.equal(wired,true,'production web adapter must use the cross-tab lock');

 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 let ran=false;await assert.rejects(webStorageExclusive('unsupported',async()=>{ran=true;}),/navegador atualizado/);
 assert.equal(ran,false,'unsupported browser must fail before touching protected data');
 delete globalThis.window;assert.equal(await webStorageExclusive('server-render',async()=>null),null);
 console.log('Protected storage concurrency passed: independent realms, actual WebCrypto GCM, one key per entry, write/delete serialization, failed migration recovery, account separation, real adapter lock wiring, unsupported-browser fail-closed and SSR. Lock broker is simulated; this is not a browser E2E.');
} finally {
 for(const [name,descriptor] of [['window',originalWindow],['navigator',originalNavigator]]){
  if(descriptor)Object.defineProperty(globalThis,name,descriptor);else delete globalThis[name];
 }
}
