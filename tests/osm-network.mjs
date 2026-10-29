import assert from 'node:assert/strict';
import { fetchOsmPayload, readBoundedJson } from '../supabase/functions/lugares-osm/network.js';

const query='[out:json];nwr["name"](-28.69,-49.38,-28.67,-49.36);out center;';
let calls=[];
const success=await fetchOsmPayload(query,async(url,options)=>{calls.push({url,options});return Response.json({elements:[]});});
assert.equal(calls.length,1);
assert.equal(success.endpoint,'https://overpass-api.de/api/interpreter');
assert.equal(calls[0].options.method,'POST');
assert.equal(new URLSearchParams(calls[0].options.body).get('data'),query);
assert.equal(calls[0].options.headers['Content-Type'],'application/x-www-form-urlencoded; charset=UTF-8');

calls=[];
const delays=[];
const fallback=await fetchOsmPayload(query,async(url)=>{calls.push(url);return calls.length===1?new Response('',{status:503}):Response.json({elements:[]});},{pause:async ms=>delays.push(ms),random:()=>0.5});
assert.equal(calls.length,2);
assert.deepEqual(delays,[625],'transient retry includes bounded backoff and jitter');
assert.equal(fallback.endpoint,'https://overpass.private.coffee/api/interpreter');

calls=[];
await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);return new Response('',{status:429});}),error=>error.status===429);
assert.equal(calls.length,1);
calls=[];
await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);return new Response('',{status:406});},{pause:async()=>assert.fail('406 must not be retried')}),error=>error.status===406);
assert.equal(calls.length,1);
calls=[];
await assert.rejects(()=>fetchOsmPayload(query,async(url)=>{calls.push(url);return Response.json({elements:[],remark:'runtime error: Query timed out'});}),/incomplete_response/);
assert.equal(calls.length,1);
await assert.rejects(()=>readBoundedJson(new Response('invalid JSON')),/invalid_json/);
await assert.rejects(()=>readBoundedJson(new Response('{}',{headers:{'Content-Length':'100'}}),5),/response_too_large/);

let cancelled=false;
const oversized=new Response(new ReadableStream({start(controller){controller.enqueue(new Uint8Array(6));},cancel(){cancelled=true;}}));
await assert.rejects(()=>readBoundedJson(oversized,5),/response_too_large/);
assert.equal(cancelled,true);
const utf8=new TextEncoder().encode('{"nome":"Praça"}');
const streamed=new Response(new ReadableStream({start(controller){for(const byte of utf8)controller.enqueue(Uint8Array.of(byte));controller.close();}}));
assert.deepEqual(await readBoundedJson(streamed),{nome:'Praça'});
calls=[];
await fetchOsmPayload(query,async(url)=>{calls.push(url);if(calls.length===1)throw new TypeError('Network error');return Response.json({elements:[]});});
assert.equal(calls.length,2);
console.log('OSM network checks passed: encoded QL POST, fallback, quota handling, incomplete responses, stream limits and UTF-8. Transport responses are simulated.');
