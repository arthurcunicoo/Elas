import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { serialTasks, isPushData, isPushToken } from '../lib/push.ts';
function load(file,mocks) {
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
 const module={exports:{}};new Function('require','module','exports',code)(name=>{if(!(name in mocks))throw Error('Unmocked '+name);return mocks[name];},module,module.exports);return module.exports;
}
const owner='00000000-0000-0000-0000-000000000001',other='00000000-0000-0000-0000-000000000002';
const values=new Map(),calls=[],permissions={granted:false,canAskAgain:true};
let current=owner,active=false,allow=false,token='ExpoPushToken[fixture_01234567890]',waitToken;
let presses,rotations,opened=0,closed=0,prompts=0;
const notifications={AndroidImportance:{DEFAULT:3},setNotificationChannelAsync:async()=>{},getPermissionsAsync:async()=>({...permissions}),
 requestPermissionsAsync:async()=>{prompts++;permissions.granted=allow;return {...permissions};},
 getExpoPushTokenAsync:async()=>{if(waitToken)await waitToken;return {data:token};},
 setNotificationHandler:()=>{},addNotificationResponseReceivedListener:fn=>{presses=fn;return {remove:()=>closed++};},
 addPushTokenListener:fn=>{rotations=fn;return {remove:()=>closed++};},
 getLastNotificationResponseAsync:async()=>null,clearLastNotificationResponseAsync:async()=>{},
};
let revokeError=false;
const backend={auth:{getSession:async()=>({data:{session:{user:{id:current}}},error:null}),signOut:async()=>{calls.push('signout');return {error:null};}},rpc:async(name,args)=>{
 calls.push(name);
 if(name==='estado_push')return {data:{disponivel:true,ativo:active},error:null};
 if(name==='registrar_push'){
  if(args.p_usuario!==current)return {error:{code:'42501',message:'Sessão alterada'}};
  active=true;return {error:null};
 }
 if(name==='desativar_push'){if(revokeError)throw Error('offline');active=false;return {error:null};}
 throw Error(name);
}};
const mocks={
 '@react-native-async-storage/async-storage':{default:{getItem:async k=>values.get(k)??null,setItem:async(k,v)=>values.set(k,v),removeItem:async k=>values.delete(k)}},
 'expo-constants':{default:{executionEnvironment:'standalone',easConfig:{projectId:other}}},'expo-device':{isDevice:true},
 'expo-crypto':{randomUUID:()=>other},'react-native':{Platform:{OS:'android'}},'../lib/supabase':{backendConfigured:true,requireBackend:()=>backend},
 '../lib/push':{serialTasks,isPushData,isPushToken},'expo-notifications':notifications,
};
const service=load('services/push.ts',mocks);
await service.enablePush(owner,false);assert.equal(prompts,0);assert.equal(calls.length,0,'no opt-in means no request or registration');
await assert.rejects(service.enablePush(owner),/Permita notificações/);assert.equal(active,false);assert.equal(prompts,1);
allow=true;await service.enablePush(owner);assert.equal(active,true);assert.equal(prompts,2);
token='ExpoPushToken[rotated_01234567890]';await service.enablePush(owner,false);assert.equal(active,true);assert.equal(prompts,2,'refresh never asks permission again');
const account=load('services/account.ts',{'../lib/publicOffline':{publicOfflineStore:{clear:async()=>{}}},'../lib/supabase':{requireBackend:()=>backend},'../lib/account':{createRecoveryClient:()=>null},'./push':service});
await account.signOut();assert.deepEqual(calls.slice(-2),['desativar_push','signout']);assert.equal(active,false);
await service.enablePush(owner,false);assert.equal(active,false,'logging in again cannot restore an opted-out preference');
await service.enablePush(owner);revokeError=true;const before=calls.filter(x=>x==='signout').length;
await assert.rejects(account.signOut(),/offline/);assert.equal(calls.filter(x=>x==='signout').length,before,'do not silently leave an active registration when revocation fails');revokeError=false;
let release;waitToken=new Promise(resolve=>{release=resolve;});
const enabling=service.enablePush(owner);await new Promise(resolve=>setImmediate(resolve));const logout=account.signOut();
release();await enabling;await logout;waitToken=null;assert.equal(active,false);assert.equal(calls.at(-1),'signout');
waitToken=new Promise(resolve=>{release=resolve;});const stale=service.enablePush(owner);await new Promise(resolve=>setImmediate(resolve));current=other;release();await assert.rejects(stale,e=>e.code==='42501');waitToken=null;assert.equal(active,false,'a delayed token must not bind to a different authenticated account');current=owner;
const cleanup=await service.listenPush(()=>opened++,()=>{});await Promise.resolve();
const tap={notification:{request:{identifier:'n1',content:{data:{notificationId:owner,url:'https://ignored.invalid'}}}}};
presses(tap);presses(tap);presses({notification:{request:{identifier:'n2',content:{data:{url:'https://not-a-push.invalid'}}}}});assert.equal(opened,1);
cleanup();presses({...tap,notification:{...tap.notification,request:{...tap.notification.request,identifier:'n3'}}});assert.equal(opened,1);assert.equal(closed,2);assert.equal(typeof rotations,'function');
const unsupported=load('services/push.ts',{...mocks,'react-native':{Platform:{OS:'web'}}});assert.equal(unsupported.pushSupported,false);assert.deepEqual(await unsupported.pushState(),{disponivel:false,ativo:false});
// A settings read must not finish with an old value while enable is still in flight.
waitToken=new Promise(resolve=>{release=resolve;});
const delayed=service.enablePush(owner);await new Promise(resolve=>setImmediate(resolve));
let completed=false;const pendingState=service.pushState().then(value=>{completed=true;return value;});
await new Promise(resolve=>setImmediate(resolve));assert.equal(completed,false,'read state is serialized behind token registration');
release();await delayed;waitToken=null;assert.equal((await pendingState).ativo,true);
permissions.granted=false;assert.equal((await service.pushState()).ativo,false,'OS denial must override an old active registration in the UI');
await service.enablePush(owner,false);assert.equal(active,false,'silent sync revokes permission denied in OS settings');permissions.granted=true;
console.log('Push client flows passed: explicit consent, denied permission, silent token rotation, revocation before logout, failed revocation, registration/logout race, account switch, safe tap deduplication/listener cleanup and web fallback. Native APIs are mocked; receipt on a phone is pending.');
