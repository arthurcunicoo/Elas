import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

// Local test origin, synthetic data only. Production sources are compiled without
// algorithm changes; the raw AsyncStorage boundary uses actual browser localStorage.
export async function browserFixture(sourceRoot=process.cwd()) {
 const sources={
  'protectedStore.js':'lib/storage/protectedStore.ts',
  'protectedStorage.js':'lib/storage/protectedStorage.web.ts',
  'webStorageLock.js':'lib/storage/webStorageLock.ts',
  'publicOffline.js':'lib/publicOffline.ts',
 };
 const raw=`export default {
 async getItem(key){return localStorage.getItem(key)},
 async getAllKeys(){return Object.keys(localStorage)},
 async setItem(key,value){
  if(window.rawFailure){window.rawFailure=false;throw Error('fixture quota failure')}
  if(window.rawDelay){localStorage.setItem('__writing',key);await new Promise(r=>setTimeout(r,window.rawDelay))}
  localStorage.setItem(key,value)
 },
 async removeItem(key){localStorage.removeItem(key)}
 };`;
 const html=`<!doctype html><html><head><meta charset="utf-8"><title>ELAS storage QA</title></head>
 <body><p id="status">Loading isolated storage fixture</p>
 <script>globalThis.process={env:{EXPO_PUBLIC_SUPABASE_URL:'fixture'}};</script>
 <script type="module">
 import {protectedStorage} from './protectedStorage.js';
 import raw from './raw.js';
 import {createPublicOfflineStore} from './publicOffline.js';
 window.storage=protectedStorage;window.publicStore=createPublicOfflineStore(raw,'fixture');
 document.getElementById('status').textContent='Ready';
 </script></body></html>`;
 const server=http.createServer((req,res)=>{
  try {
   const name=new URL(req.url,'http://localhost').pathname.slice(1);
   let body,type='text/javascript';
   if(name===''||name==='fixture'){body=html;type='text/html';}
   else if(name==='raw.js')body=raw;
   else if(sources[name]){
    const file=path.join(sourceRoot,sources[name]);
    body=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.ES2022,target:ts.ScriptTarget.ES2022}}).outputText
     .replaceAll('"@react-native-async-storage/async-storage"','"./raw.js"')
     .replaceAll('"./protectedStore"','"./protectedStore.js"')
     .replaceAll('"./webStorageLock"','"./webStorageLock.js"');
   }else{res.writeHead(404);res.end();return;}
   res.writeHead(200,{'Content-Type':type+'; charset=utf-8','Cache-Control':'no-store'});res.end(body);
  }catch{res.writeHead(500);res.end('Fixture source unavailable');}
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 return {url:`http://127.0.0.1:${server.address().port}`,close:()=>new Promise(resolve=>server.close(resolve))};
}
