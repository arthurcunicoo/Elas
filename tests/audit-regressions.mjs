import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import ts from 'typescript';
import {verifyIosBuild} from '../scripts/qa/ios-diagnostics.mjs';
import {measuredFetch} from '../lib/monitoring/network.ts';
import {evidenceIssues,releaseRequirements} from '../scripts/qa/release-check.mjs';
import {compareRun} from '../scripts/qa/visual.mjs';
import {friendlyError} from '../lib/errors.ts';
assert.equal(friendlyError({message:'Consulta encerrada'}),'Enquete encerrada');
// Recovery/verification retain isolated Auth while sharing the normal HTTP middleware.
let options;const fetcher=async()=>new Response('fixture');
const module={exports:{}};
const source=ts.transpileModule(fs.readFileSync('lib/account.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
new Function('require','module','exports',source)(name=>{
 if(name==='@supabase/supabase-js')return {createClient:(_url,_key,value)=>{options=value;return {fixture:true};}};
 if(name==='./supabase')return {backendConfigured:true,backendFetch:fetcher,requireBackend:()=>({})};
 throw Error('Unexpected dependency '+name);
},module,module.exports);
module.exports.createRecoveryClient();
assert.equal(options.global.fetch,fetcher,'temporary Auth must retain the deadline/monitoring middleware');
assert.equal(options.auth.persistSession,false);assert.equal(options.auth.autoRefreshToken,false);assert.equal(options.auth.storageKey,'elas-recovery-only');

const cancelled=new AbortController();cancelled.abort();let measurement;
await assert.rejects(measuredFetch(async()=>{throw Error('abort');},value=>{measurement=value;})(new Request('https://fixture.invalid',{signal:cancelled.signal})));
assert.equal(measurement.outcome,'cancelled','instrumentation must recognize cancellation stored on Request');

// WebDriver protocol fixtures never count as an iPhone execution or evidence.
const commands=[],host='staging-fixture.supabase.co';
const labels={'qa-backend':`Backend: ${host}`,'qa-font-scale':'Escala de fonte: 1.60 · 390 × 844','qa-build':'App: 1.1.0 | build: 42'};
const command=async(method,route,body)=>{commands.push({method,route,body});return labels[route.split('/')[4]];};
const check=()=>verifyIosBuild({command,element:async id=>id,session:'fixture',expectedHost:host,os:'18.5'});
const result=await check();assert.deepEqual(result,{backendHost:host,fontScale:1.6,appVersion:'1.1.0',build:'42',os:'18.5'});
assert.deepEqual(commands[0].body,{script:'mobile: deepLink',args:[{url:'elas-qa://diagnostico',bundleId:'br.com.elasnacidade.app.qa'}]});
labels['qa-backend']='Backend: pxcbzjxgxdmdayqwpqcj.supabase.co';await assert.rejects(check(),/staging/);
labels['qa-backend']=`Backend: ${host}`;labels['qa-build']='App: unknown | build: unknown';await assert.rejects(check(),/build/);
labels['qa-build']='App: 1.1.0 | build: 42';labels['qa-font-scale']='Escala ausente';await assert.rejects(check(),/fonte/);
// A directory, a future timestamp or evidence from an old app cannot release this build.
const root=fs.mkdtempSync(path.join(os.tmpdir(),'elas-audit-gate-'));
fs.writeFileSync(path.join(root,'app.json'),JSON.stringify({expo:{version:'1.1.0'}}));
fs.mkdirSync(path.join(root,'qa/evidence/not-a-file'),{recursive:true});
const report={version:1,appVersion:'1.1.0',requirements:releaseRequirements.map(id=>({id,status:'passed',artifact:'qa/evidence/not-a-file',executedAt:new Date().toISOString(),reviewer:'QA fixture'}))};
assert.equal(evidenceIssues(report,root).filter(x=>x.startsWith('Evidência ausente')).length,22);
fs.writeFileSync(path.join(root,'qa/evidence/fixture.json'),'{}');report.requirements=report.requirements.map(row=>({...row,artifact:'qa/evidence/fixture.json'}));
assert.deepEqual(evidenceIssues(report,root),[],'the validator checks reviewed metadata/files, not authenticity of human evidence');
assert.ok(evidenceIssues({...report,appVersion:'0.0.1'},root).length);
assert.ok(evidenceIssues({...report,requirements:[...report.requirements,report.requirements[0]]},root).some(x=>x.includes('duplicados')));
assert.ok(evidenceIssues({...report,requirements:report.requirements.map(row=>({...row,executedAt:'2099-01-01T00:00:00Z'}))},root).some(x=>x.includes('Data')));
const runDir=path.join(root,'run');fs.mkdirSync(runDir);
const originalCwd=process.cwd();
try {
 process.chdir(root);
 const baseline=path.join(root,'qa/visual/baselines/fixture/1');fs.mkdirSync(baseline,{recursive:true});
 fs.writeFileSync(path.join(baseline,'manifest.json'),JSON.stringify({appVersion:'1.0.0',build:'1',os:'17',approvedBy:'QA fixture',approvedAt:new Date().toISOString(),screens:[{name:'screen'}]}));
 fs.writeFileSync(path.join(runDir,'run.json'),JSON.stringify({status:'passed',deviceKey:'fixture',fontScale:1,appVersion:'1.1.0',build:'42',os:'18'}));
 assert.throws(()=>compareRun(runDir,'fixture',1),/Build\/OS/,'an image from another OS must not count as a valid comparison');
}finally{process.chdir(originalCwd);fs.rmSync(root,{recursive:true,force:true});}
console.log('Audit regressions passed: Request cancellation/telemetry, isolated recovery HTTP middleware, iOS backend/build/font/OS verification and rejection of production or missing metadata. No device execution is claimed.');
