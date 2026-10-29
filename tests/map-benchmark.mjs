import fs from 'node:fs';
import { performance } from 'node:perf_hooks';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import assert from 'node:assert/strict';
import * as geometry from '../features/map/web/geometry.ts';
import * as providers from '../features/map/web/tileProvider.ts';
import { visibleMapPlaces } from '../constants/placeRelevance.ts';
const require=createRequire(import.meta.url);globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const error=console.error;console.error=(...a)=>{if(!String(a[0]).includes('react-test-renderer is deprecated'))error(...a);};
async function measure(file){
 const module={exports:{}};const code=ts.transpileModule(fs.readFileSync(new URL(file,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 const mocks={'react':React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':{Image:'Image',View:'View',StyleSheet:{create:x=>x,absoluteFill:{}}},'../../../features/map/web/geometry':geometry,'../../../features/map/web/tileProvider':providers};
 new Function('require','module','exports',code)(n=>{assert.ok(n in mocks,n);return mocks[n];},module,module.exports);
 let callbacks=0,renderer;const props={left:0,top:0,width:390,height:700,zoom:15,provider:providers.createTileProvider({mode:'pilot'}),onFailure:()=>callbacks++};
 await act(async()=>{renderer=TestRenderer.create(React.createElement(module.exports.WebMapTiles,props));});
 const images=renderer.root.findAllByType('Image');await act(async()=>images.forEach(n=>n.props.onLoad()));
 const initialFailureCallbacks=callbacks;
 for(let i=1;i<=100;i++)await act(async()=>renderer.update(React.createElement(module.exports.WebMapTiles,{...props,left:i/2})));
 const stable=renderer.root.findAllByType('Image').every((node,i)=>node.props.source===images[i].props.source);
 await act(async()=>renderer.unmount());return {initialFailureCallbacks,stableImageSourcesAcross100Pans:stable};
}
const baseline=await measure('../qa/benchmarks/baseline/WebMapTiles.tsx.txt'),current=await measure('../components/map/web/WebMapTiles.tsx');
assert.equal(baseline.initialFailureCallbacks,7);assert.equal(current.initialFailureCallbacks,1);assert.equal(current.stableImageSourcesAcross100Pans,true);
const region={latitude:-28.678,longitude:-49.369,latitudeDelta:.05,longitudeDelta:.05};
const markerRuns=[];
for(const count of [100,500,1500,5000]){
 const places=Array.from({length:count},(_,i)=>({id:String(i),name:`Loja ${i}`,category:i%25===0?'mall':'clothes',latitude:region.latitude+(i%50-25)*.0005,longitude:region.longitude+(Math.floor(i/50)%50-25)*.0005}));
 for(let i=0;i<5;i++)visibleMapPlaces(places,region,{width:390,height:700});
 const times=[];let visible=0;for(let i=0;i<30;i++){const start=performance.now();visible=visibleMapPlaces(places,region,{width:390,height:700}).length;times.push(performance.now()-start);}times.sort((a,b)=>a-b);
 markerRuns.push({inputPlaces:count,visibleMarkers:visible,medianMs:times[15],p95Ms:times[28]});
}
console.error=error;
console.log(JSON.stringify({environment:'Node '+process.version+'; React simulated hosts; JS selection only, not Android/iOS FPS or RAM',baseline,current,markerRuns},null,2));
