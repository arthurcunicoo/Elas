// Executes the real k6 binary against an isolated HTTP fixture. Never benchmarks production.
import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawn} from 'node:child_process';
const out=fs.mkdtempSync(path.join(os.tmpdir(),'elas-load-protocol-')),seen=new Map(),ids=Array.from({length:500},(_,i)=>({id:'fixture-'+i}));
const server=http.createServer(async(req,res)=>{let raw='';for await(const chunk of req)raw+=chunk;const data=JSON.parse(raw||'{}'),route=req.url.split('/').at(-1);let body;
 if(route==='mapa_lugares')body={places:ids};else if(route==='resumos_avaliacoes'){assert.equal(data.p_compacto,true);assert.equal(data.p_lugares.length,500);body={politica:{versao:1},resumos:data.p_lugares.map(lugar_id=>({lugar_id,total:0}))};}else if(route==='mapa_relatos')body={total:0,nodes:[]};else if(route==='pagina_app')body={rows:[],nextCursor:null};else if(route==='painel_impactos')body={minhas:{},cidade:{}};else if(route==='lugares-osm')body={places:ids};else{res.writeHead(404);res.end();return;}
 const key=route==='pagina_app'?data.p_lista:route;seen.set(key,(seen.get(key)??0)+1);assert.ok(req.headers.authorization.startsWith('Bearer fixture-'));res.writeHead(200,{'Content-Type':'application/json'});res.end(JSON.stringify(body));});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const sessions=path.join(out,'sessions.json');fs.writeFileSync(sessions,JSON.stringify(Array.from({length:5},(_,i)=>({user_id:'fixture-user-'+i,access_token:'fixture-'+i,expires_at:Math.floor(Date.now()/1000)+3600}))),{mode:0o600});
const log=fs.createWriteStream(path.join(out,'k6.log'));const child=spawn(process.env.K6_BIN??'k6',['run','--summary-export',path.join(out,'summary.json'),'qa/load/read-flows.js'],{env:{...process.env,K6_NO_USAGE_REPORT:'true',QA_LOCAL_FIXTURE:'1',QA_SUPABASE_URL:`http://127.0.0.1:${server.address().port}`,QA_TOKENS_FILE:sessions,QA_PUBLISHABLE_KEY:'sb_publishable_fixture'}});child.stdout.pipe(log);child.stderr.pipe(log);
try{const exit=await new Promise((resolve,reject)=>{child.on('exit',resolve);child.on('error',reject);});assert.equal(exit,0,'Read the local k6 log at '+out);for(const name of ['mapa_lugares','resumos_avaliacoes','mapa_relatos','eventos','lugares','painel_impactos','lugares-osm'])assert.ok(seen.get(name)>0,name);const summary=JSON.parse(fs.readFileSync(path.join(out,'summary.json')));assert.equal(summary.metrics.http_req_failed.value??summary.metrics.http_req_failed.values?.rate??summary.metrics.http_req_failed.rate,0);console.log(JSON.stringify({kind:'local-http-protocol-only',passed:true,operations:Object.fromEntries(seen),output:out,note:'Real k6, five virtual users, isolated fixture; no Supabase/database load benchmark.'}));}finally{await new Promise(resolve=>server.close(resolve));log.end();}
