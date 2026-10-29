import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';
import {browserFixture} from '../scripts/qa/browser-fixture.mjs';

const fixture=await browserFixture(process.env.QA_BROWSER_SOURCE_ROOT??process.cwd());
let browser,context;const checks=[];
const passed=name=>checks.push(name);
const output=process.env.QA_BROWSER_OUTPUT;
try {
 browser=await chromium.launch({headless:true,...(process.env.QA_BROWSER_EXECUTABLE?{executablePath:process.env.QA_BROWSER_EXECUTABLE}:{}),args:['--no-sandbox']});
 context=await browser.newContext();
 await context.route('**/*',route=>new URL(route.request().url()).origin===fixture.url?route.continue():route.abort());
 const a=await context.newPage(),b=await context.newPage();
 for(const page of [a,b]){await page.goto(fixture.url);await page.waitForFunction(()=>!!window.storage&&!!window.publicStore);}
 assert.equal(await a.evaluate(()=>isSecureContext&&!!navigator.locks&&!!crypto.subtle&&!!indexedDB),true);
 passed('secure-context Web Locks, IndexedDB and WebCrypto available in real Chromium');

 // Force a natural asynchronous ordering that corrupted independent-tab keys.
 await a.evaluate(()=>{
  window.rawDelay=200;
  const generate=crypto.subtle.generateKey.bind(crypto.subtle);
  crypto.subtle.generateKey=async(...args)=>{localStorage.setItem('__generating','yes');await new Promise(r=>setTimeout(r,100));return generate(...args)};
 });
 await b.evaluate(()=>{
  const generate=crypto.subtle.generateKey.bind(crypto.subtle);
  crypto.subtle.generateKey=async(...args)=>{await new Promise(r=>setTimeout(r,150));return generate(...args)};
 });
 const first=a.evaluate(()=>window.storage.setItem('account-a:race','first'));
 await b.waitForFunction(()=>localStorage.getItem('__generating')==='yes');
 await Promise.all([first,b.evaluate(()=>window.storage.setItem('account-a:race','second'))]);
 assert.equal(await a.evaluate(()=>window.storage.getItem('account-a:race')),'second');
 passed('two real tabs preserve one usable key under delayed concurrent creation/writes');
 await a.reload();await a.waitForFunction(()=>!!window.storage);await b.reload();await b.waitForFunction(()=>!!window.storage);
 assert.equal(await b.evaluate(()=>window.storage.getItem('account-a:race')),'second');
 passed('ciphertext and non-extractable key survive page reload');

 const keyFlags=await a.evaluate(async()=>{
  const db=await new Promise((resolve,reject)=>{const r=indexedDB.open('elas-protected-keys-v1',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});
  const key=await new Promise((resolve,reject)=>{const r=db.transaction('keys').objectStore('keys').get('account-a:race');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error)});db.close();
  let rejected=false;try{await crypto.subtle.exportKey('raw',key)}catch{rejected=true}
  return {extractable:key.extractable,exportRejected:rejected};
 });
 assert.deepEqual(keyFlags,{extractable:false,exportRejected:true});passed('actual IndexedDB CryptoKey cannot be exported');

 const unicode='relato com acentuação 🦋 '.repeat(1500);
 await a.evaluate(value=>window.storage.setItem('account-a:large',value),unicode);
 assert.equal(await b.evaluate(()=>window.storage.getItem('account-a:large')),unicode);
 const raw=await a.evaluate(()=>localStorage.getItem('account-a:large'));
 assert.ok(raw.startsWith('elas.enc.v1:')&&!raw.includes('acentuação'));
 await b.evaluate(value=>window.storage.setItem('account-a:large',value),unicode);
 assert.notEqual(await a.evaluate(()=>localStorage.getItem('account-a:large')),raw);
 passed('large Unicode sessions round-trip encrypted with fresh nonce');

 await a.evaluate(()=>localStorage.setItem('account-a:legacy','recover legacy'));
 assert.deepEqual(await Promise.all([a.evaluate(()=>window.storage.getItem('account-a:legacy')),b.evaluate(()=>window.storage.getItem('account-a:legacy'))]),['recover legacy','recover legacy']);
 assert.ok(!(await a.evaluate(()=>localStorage.getItem('account-a:legacy'))).includes('recover legacy'));
 passed('concurrent legacy plaintext migration is durable across tabs');
 await a.evaluate(()=>{localStorage.setItem('account-a:failure','keep me');window.rawFailure=true;});
 assert.equal(await a.evaluate(async()=>{try{await window.storage.getItem('account-a:failure');return false}catch{return localStorage.getItem('account-a:failure')==='keep me'}}),true);
 assert.equal(await b.evaluate(()=>window.storage.getItem('account-a:failure')),'keep me');
 passed('failed migration preserves legacy content and releases browser lock for retry');

 await a.evaluate(()=>window.storage.setItem('account-b:large','other account'));
 const swapped=await b.evaluate(async()=>{
  localStorage.setItem('account-b:large',localStorage.getItem('account-a:large'));
  try{await window.storage.getItem('account-b:large');return false}catch{return true}
 });
 assert.equal(swapped,true);assert.equal(await a.evaluate(()=>window.storage.getItem('account-a:large')),unicode);
 passed('ciphertext cannot be substituted into another account/key context');

 await a.evaluate(()=>{window.rawDelay=150;localStorage.removeItem('__writing')});
 const writing=a.evaluate(()=>window.storage.setItem('account-a:race','late'));
 await b.waitForFunction(()=>localStorage.getItem('__writing')==='account-a:race');
 await Promise.all([writing,b.evaluate(()=>window.storage.removeItem('account-a:race'))]);
 assert.equal(await a.evaluate(()=>window.storage.getItem('account-a:race')),null);
 passed('cross-tab delete waits for the writer and leaves no orphaned ciphertext');

 const before=await b.evaluate(()=>localStorage.getItem('account-a:large'));
 await b.evaluate(async()=>{
  const db=await new Promise(resolve=>{const r=indexedDB.open('elas-protected-keys-v1',1);r.onsuccess=()=>resolve(r.result)});
  await new Promise((resolve,reject)=>{const tx=db.transaction('keys','readwrite');tx.objectStore('keys').delete('account-a:large');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error)});db.close();
 });
 assert.equal(await a.evaluate(async()=>{try{await window.storage.setItem('account-a:large','overwrite');return false}catch{return true}}),true);
 assert.equal(await b.evaluate(()=>localStorage.getItem('account-a:large')),before);
 passed('lost browser key fails closed without overwriting ciphertext');

 await b.evaluate(()=>window.publicStore.save('A',[{id:'place',name:'Biblioteca',address:'Centro',latitude:-28.67,longitude:-49.36,description:'PRIVATE',reviewSummary:{comment:'SECRET'}}]));
 const snapshot=await a.evaluate(()=>window.publicStore.read('A'));
 assert.deepEqual(Object.keys(snapshot.rows[0]).sort(),['address','id','latitude','longitude','name']);
 assert.equal(await a.evaluate(()=>window.publicStore.read('B')),null);
 await a.evaluate(()=>{const key='elas.public.v1:fixture:A';const value=JSON.parse(localStorage.getItem(key));value.savedAt=new Date(Date.now()-8*86400000).toISOString();localStorage.setItem(key,JSON.stringify(value));});
 assert.equal(await b.evaluate(()=>window.publicStore.read('A')),null);
 passed('public offline snapshot stays minimal, owner-scoped and expires after TTL');

 await a.evaluate(()=>{Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});});
 assert.equal(await a.evaluate(async()=>{try{await window.storage.setItem('unsupported','plaintext');return false}catch{return localStorage.getItem('unsupported')===null}}),true);
 passed('unsupported-browser path cannot fall back to plaintext writes');
 const report={passed:true,browser:await browser.version(),checks,scope:'Real Chromium tabs, IndexedDB, WebCrypto, Web Locks and localStorage; raw AsyncStorage timing/failure boundary simulated; not native device E2E.'};
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
} catch(error) {
 const blocked=checks.length===0&&error.message.includes('socket() failed: Operation not permitted');
 const report={passed:false,status:blocked?'blocked_environment':'failed',checks,error:blocked?'Chromium could not create its process-singleton socket: Operation not permitted. No browser test executed.':error.message};
 if(output)fs.writeFileSync(output,JSON.stringify(report,null,2)+'\n');
 if(blocked){console.error(JSON.stringify(report));process.exitCode=2;}else throw error;
} finally {await context?.close();await browser?.close();await fixture.close();}
