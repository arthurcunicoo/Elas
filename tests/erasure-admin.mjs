import assert from 'node:assert/strict';
import {createErasureHandler} from '../supabase/functions/account-erasure/worker.ts';
import {stagingConfiguration,validateStagingPermissions} from '../scripts/operations/staging-permissions.mjs';
import {operationalReadiness} from '../scripts/operations/readiness.mjs';
let destructive=0;
const message='Transfira a administração antes de remover o último administrador.';
const handler=createErasureHandler({authenticate:async()=>({id:'fixture',email:'qa@example.invalid'}),verifyPassword:async()=>true,
 begin:async()=>{throw Object.assign(Error(message),{code:'23514'});},revoke:async()=>destructive++,removeAvatars:async()=>destructive++,erase:async()=>destructive++});
const response=await handler(new Request('https://fixture.invalid',{method:'POST',headers:{authorization:'Bearer fixture'},body:JSON.stringify({password:'fixture',confirmation:'EXCLUIR'})}));
assert.equal(response.status,409);assert.equal((await response.json()).message,message);assert.equal(destructive,0);
const env={QA_SUPABASE_URL:'https://pxcbzjxgxdmdayqwpqcj.supabase.co',QA_PUBLISHABLE_KEY:'fixture',QA_EMAIL_A:'a@example.invalid',QA_PASSWORD_A:'a',QA_EMAIL_B:'b@example.invalid',QA_PASSWORD_B:'b',QA_EMAIL_ADMIN:'admin@example.invalid',QA_PASSWORD_ADMIN:'c'};
assert.throws(()=>stagingConfiguration(env),/staging/);
await assert.rejects(validateStagingPermissions(env,()=>assert.fail('must reject production before creating a client')),/staging/);
assert.throws(()=>stagingConfiguration({...env,QA_SUPABASE_URL:'https://staging-fixture.supabase.co',QA_EMAIL_B:env.QA_EMAIL_A}),/distintas/);
const readiness=operationalReadiness({EXPO_ACCESS_TOKEN:'do-not-print',QA_PASSWORD_A:'do-not-print'});
assert.ok(!JSON.stringify(readiness).includes('do-not-print'));assert.equal(readiness.requirements.expoAccessToken,true);assert.equal(readiness.kind,'configuration-only');
console.log('Erasure/admin operations passed: last-admin refusal precedes irreversible steps; real QA runner blocks production/duplicate accounts before network; readiness contains no credential values. No mailbox/device evidence is claimed.');
