import assert from 'node:assert/strict';
import {validateBounds,boundsKey,buildQuery,parseOsmPlaces,reconcilePlaces,createCatalogHandler} from '../supabase/functions/lugares-osm/catalog.ts';
const raw={south:-28.686,west:-49.377,north:-28.670,east:-49.361};
const bounds=validateBounds(raw);
assert.throws(()=>validateBounds({south:NaN,west:0,north:1,east:1}));
assert.throws(()=>validateBounds({...raw,north:0})); // oversized regions remain bounded
assert.equal(validateBounds({south:-27.7,west:-48.6,north:-27.5,east:-48.4}).north,-27.5); // coverage is database configuration
assert.notEqual(boundsKey(bounds),boundsKey(validateBounds({...raw,south:-28.6855})));
assert.match(buildQuery(bounds),/out center tags 400/);
const payload={elements:[
 {type:'node',id:42,lat:-28.678,lon:-49.369,tags:{name:'Padaria teste','shop':'bakery','addr:street':'Rua A','addr:housenumber':'1'}},
 {type:'way',id:42,center:{lat:-28.679,lon:-49.370},tags:{name:'Praça teste',leisure:'park'}},
 {type:'node',id:42,lat:-28.678,lon:-49.369,tags:{name:'Padaria teste',shop:'bakery'}},
 {type:'node',id:2,lat:0,lon:0,tags:{name:'Fora da área'}},
 {type:'node',id:3,lat:-28.678,lon:-49.369,tags:{}},
 {type:'injection',id:1,lat:-28.678,lon:-49.369,tags:{name:'Inválido'}}
]};
const rows=parseOsmPlaces(payload,bounds);
assert.equal(rows.length,2);assert.equal(rows[0].id,'osm:node:42');assert.equal(rows[1].id,'osm:way:42');
assert.throws(()=>parseOsmPlaces({elements:[],remark:'timeout'},bounds));
const seeded={id:'manual-seed',nome:rows[0].nome,latitude:rows[0].latitude,longitude:rows[0].longitude};
const firstImport=reconcilePlaces(rows,[seeded]);assert.equal(firstImport[0].id,'manual-seed');
const secondImport=reconcilePlaces(rows,firstImport);assert.equal(secondImport[0].id,'manual-seed');assert.equal(secondImport.length,2);
let authed=true,reads=0,fail=false;
const store={authenticate:async()=>authed,list:async(b,category,authorization)=>{assert.match(authorization,/^Bearer /);reads++;if(fail)throw Error('database offline');return {places:rows,total:2,displayLimited:false};}};
const handler=createCatalogHandler(store);
const req=(body={bounds:raw},token=true)=>new Request('https://example.test',{method:'POST',headers:{...(token?{Authorization:'Bearer test-fixture'}:{}),'Content-Type':'application/json'},body:JSON.stringify(body)});
assert.equal((await handler(req({},false))).status,401);assert.equal(reads,0);
authed=false;assert.equal((await handler(req())).status,401);assert.equal(reads,0);authed=true;
assert.equal((await handler(req({bounds:{south:0,west:0,north:20,east:20}}))).status,422);assert.equal(reads,0);
let response=await handler(req());assert.equal(response.status,200);assert.equal((await response.json()).places.length,2);assert.equal(reads,1);
fail=true;assert.equal((await handler(req())).status,503);
assert.equal((await handler(new Request('https://example.test',{method:'OPTIONS'}))).status,200);
assert.equal((await handler(new Request('https://example.test',{method:'GET'}))).status,405);
assert.deepEqual(reconcilePlaces([rows[0]],[{...rows[0],duplicado_de:'canonical'}]),[],'an OSM refresh cannot revive a confirmed alias');
assert.deepEqual(parseOsmPlaces({elements:[{type:'way',id:777,center:{lat:-28.678,lon:-49.369},tags:{name:'Canteiro Avenida',leisure:'park'}}]},bounds),[]);
const oversized=createCatalogHandler({...store,list:async()=>({places:Array.from({length:501},(_,i)=>({...rows[0],id:String(i)}))})});
assert.equal((await oversized(req())).status,503,'invalid over-limit database payloads are rejected instead of ranked after transfer');
console.log('OSM checks passed: generic bounded geometry, typed IDs, parsing, conservative reconciliation, database-only compatibility endpoint, authentication, error/CORS and bounded transport validation.');
