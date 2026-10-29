import assert from 'node:assert/strict';
import { RegionRequestCache, PlaceCache } from '../features/map/cache.ts';
import { catalogRequestKey, queryRegion } from '../features/map/region.ts';
import { createFrameScheduler } from '../features/map/frameScheduler.ts';
import { createCatalogHandler, validateBounds, boundsKey } from '../supabase/functions/lugares-osm/catalog.ts';

const region={latitude:-28.6784,longitude:-49.3694,latitudeDelta:.016,longitudeDelta:.016};
const bounds={south:region.latitude-.008,north:region.latitude+.008,west:region.longitude-.008,east:region.longitude+.008};
assert.notEqual(catalogRequestKey(region),boundsKey(validateBounds(bounds)));
assert.equal(catalogRequestKey(region),catalogRequestKey({...region,latitude:region.latitude+.00001})); // small pans share the same padded geometry
assert.notEqual(catalogRequestKey(region),catalogRequestKey({...region,latitude:region.latitude+.01}));

let count=0, release;
const cache=new RegionRequestCache(2,1000);
const loader=()=>{count++;return new Promise(resolve=>release=resolve);};
const first=cache.run('A',loader), second=cache.run('A',loader);
await Promise.resolve();assert.equal(first,second);assert.equal(count,1);
release('ready');assert.equal(await first,'ready');
await cache.run('A',loader);assert.equal(count,1);
await cache.run('A',async()=>{count++;return 'refreshed';},true);assert.equal(count,2);
await cache.run('A',async()=>{count++;return 'expired';},false,Date.now()+2000);assert.equal(count,3);
await cache.run('B',async()=> 'B');await cache.run('C',async()=> 'C');
await cache.run('A',async()=>{count++;return 'evicted';});assert.equal(count,4);
await assert.rejects(cache.run('bad',async()=>{throw new Error('offline');}));
assert.equal(await cache.run('bad',async()=> 'recovered'),'recovered');
cache.clear();assert.equal(await cache.run('A',async()=> 'new account'),'new account');
// A completed old account request cannot replace a new account entry.
let oldResolve;
const old=cache.run('scope',()=>new Promise(resolve=>oldResolve=resolve));await Promise.resolve();
cache.clear();await cache.run('scope',async()=> 'new');oldResolve('old');await old;
assert.equal(await cache.run('scope',async()=> 'incorrect'),'new');
const places=new PlaceCache(), row={id:'x',name:'Place',address:'Centro',latitude:-28.678,longitude:-49.369,status:'unknown'};
const saved=places.merge([row])[0];assert.equal(places.merge([{...row}])[0],saved);
assert.notEqual(places.merge([{...row,name:'Updated'}])[0],saved);

let frameCount=0, callback, cancelled=0;const applied=[];
const frames=createFrameScheduler(value=>applied.push(value), cb=>{callback=cb;return ++frameCount;},()=>cancelled++);
for(let i=0;i<1000;i++)frames.schedule(i);
assert.equal(frameCount,1);assert.deepEqual(applied,[]);callback();assert.deepEqual(applied,[999]);
frames.schedule(1000);frames.flush();assert.deepEqual(applied,[999,1000]);assert.equal(cancelled,1);
frames.schedule(1001);frames.cancel();callback();assert.deepEqual(applied,[999,1000]);

let reads=0;
const store={authenticate:async()=>true,list:async()=>{reads++;return {places:[{id:row.id,nome:row.name,latitude:row.latitude,longitude:row.longitude}],updatedAt:'2026-10-01T00:00:00Z'};}};
const request=()=>new Request('https://test.invalid',{method:'POST',headers:{Authorization:'Bearer fixture','Content-Type':'application/json'},body:JSON.stringify({bounds})});
const response=await createCatalogHandler(store)(request());const body=await response.json();
assert.equal(response.status,200);assert.equal(body.places.length,1);assert.equal(body.refreshing,false);assert.equal(reads,1);
assert.equal(body.updatedAt,'2026-10-01T00:00:00Z');
const denied=createCatalogHandler({...store,authenticate:async()=>false});assert.equal((await denied(request())).status,401);assert.equal(reads,1);
console.log('Map performance checks passed: quantized padded identity, request sharing/TTL/eviction/retry/account isolation, stable markers, 1000 gesture events coalesced into one frame and database-only catalog reads.');
