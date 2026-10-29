import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
import {project,unproject,visibleTiles,TILE,MERCATOR_LIMIT} from '../features/map/web/geometry.ts';
import {createTileProvider,tileUrl} from '../features/map/web/tileProvider.ts';
for(let zoom=10;zoom<=20;zoom++)for(let i=0;i<100;i++) {
 const lat=-84+i*1.68,lon=-179+i*3.58,p=project(lat,lon,zoom),coordinate=unproject(p.x,p.y,zoom);
 assert.ok(Math.abs(lat-coordinate.latitude)<1e-9);assert.ok(Math.abs(lon-coordinate.longitude)<1e-9);
}
for(const lat of [-90,-85,85,90]){const p=project(lat,0,10);assert.ok(Number.isFinite(p.y));assert.ok(Math.abs(unproject(p.x,p.y,10).latitude)<=MERCATOR_LIMIT+1e-8);}
assert.deepEqual(visibleTiles(0,0,0,100,10),[]);
const tiles=visibleTiles(250,250,390,700,10);assert.equal(tiles.length,12);assert.ok(tiles.some(t=>t.x===2&&t.y===3));
assert.ok(visibleTiles(-256,-256,512,512,10).every(t=>t.y>=0));
assert.ok(visibleTiles(0,TILE*2**10-1,512,700,10).every(t=>t.y<2**10));
assert.equal(createTileProvider({}),null,'no implicit public tiles in release');
const pilot=createTileProvider({mode:'pilot'});assert.equal(pilot.maxZoom,19);assert.equal(pilot.pilot,true);assert.equal(tileUrl(pilot,20,0,0),null);
assert.equal(createTileProvider({},true).pilot,true);
const settings={template:'https://tiles.example.com/{z}/{x}/{y}.png?key=public-domain-limited',attribution:'Example tiles',attributionUrl:'https://tiles.example.com/license',maxZoom:'20'};
const provider=createTileProvider(settings);assert.equal(provider.pilot,false);assert.equal(tileUrl(provider,10,-1,2),'https://tiles.example.com/10/1023/2.png?key=public-domain-limited');assert.equal(tileUrl(provider,10,1024,2),'https://tiles.example.com/10/0/2.png?key=public-domain-limited');
for(const args of [[10,0,-1],[10,0,1024],[21,0,0],[10,.5,1],[NaN,0,0]])assert.equal(tileUrl(provider,...args),null);
for(const bad of [{template:'http://tiles.example.com/{z}/{x}/{y}'},{template:'https://secret:password@tiles.example.com/{z}/{x}/{y}'},{template:'https://tiles.example.com/{z}/{x}/{unknown}'},{maxZoom:'22'},{maxZoom:'19.5'},{attribution:''},{attributionUrl:'javascript:alert(1)'},{template:'https://tile.openstreetmap.org/{z}/{x}/{y}.png'}])assert.equal(createTileProvider({...settings,...bad}),null,'invalid custom config cannot silently fall back to public OSM');
const require=createRequire(import.meta.url),modules=new Map(),root=path.resolve(import.meta.dirname,'..');globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const native={View:'View',Image:'Image',Text:'Text',StyleSheet:{absoluteFill:{},create:x=>x},Linking:{openURL:async()=>{}}};
function load(file){if(modules.has(file))return modules.get(file).exports;const module={exports:{}};modules.set(file,module);const filename=path.join(root,file),code=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(name=>name==='react'?React:name==='react/jsx-runtime'?require(name):name==='react-native'?native:load(path.relative(root,path.resolve(path.dirname(filename),name))+'.ts'),module,module.exports);return module.exports;}
const originalError=console.error;console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
let renderer;const statuses=[],errors=[];
try {
 const {WebMapTiles}=load('components/map/web/WebMapTiles.tsx');
 const props={left:0,top:0,width:390,height:700,zoom:15,provider,onLoadStateChange:status=>statuses.push(status),onFailure:error=>errors.push(error)};
 await act(async()=>{renderer=TestRenderer.create(React.createElement(WebMapTiles,props));});
 const images=renderer.root.findAllByType('Image');assert.equal(images.length,6);assert.ok(images.every(n=>n.props.source.uri.startsWith('https://tiles.example.com/')));
 await act(async()=>{for(const image of images)image.props.onLoad();});assert.deepEqual(statuses,['ready']);
 await act(async()=>renderer.update(React.createElement(WebMapTiles,{...props,left:256})));await act(async()=>{for(const image of renderer.root.findAllByType('Image'))image.props.onLoad();});assert.deepEqual(statuses,['ready'],'panning cannot restart the initial loading dialog');
 await act(async()=>renderer.root.findAllByType('Image')[0].props.onError());assert.equal(errors.at(-1),true);
 await act(async()=>renderer.update(React.createElement(WebMapTiles,{...props,left:10000})));assert.equal(errors.at(-1),false,'an old failed tile cannot poison a new viewport');
 const staleTileLoad=renderer.root.findAllByType('Image')[0].props.onLoad;
 const previousReady=statuses.length;
 await act(async()=>renderer.update(React.createElement(WebMapTiles,{...props,provider:{...provider,template:'https://other.example.com/{z}/{x}/{y}.png'}})));
 assert.equal(statuses.length,previousReady,'provider change must wait for its own images');
 await act(async()=>staleTileLoad());assert.equal(statuses.length,previousReady,'late prior-provider callback must be ignored');
 await act(async()=>{for(const image of renderer.root.findAllByType('Image'))image.props.onLoad();});
 assert.equal(statuses.length,previousReady+1);
 await act(async()=>renderer.update(React.createElement(WebMapTiles,{...props,provider:null})));assert.equal(renderer.root.findAllByType('Image').length,0);assert.equal(statuses.at(-1),'error');
 await act(async()=>renderer.unmount());
 const {MapAttribution}=load('components/map/MapAttribution.tsx');await act(async()=>{renderer=TestRenderer.create(React.createElement(MapAttribution,{bottom:0,overture:true,web:true,tileProvider:provider}));});
 const text=renderer.root.findAllByType('Text').map(n=>n.children.join('')).join(' ');assert.ok(text.includes('OpenStreetMap'));assert.ok(text.includes('Example tiles'));assert.ok(text.includes('Overture'));assert.equal(renderer.root.findAllByType('Text').length,3);await act(async()=>renderer.unmount());
 console.log('Web map passed: 1100 Mercator round trips, polar bounds, visible-only tiles, wrapped XYZ, provider validation/no release fallback/zoom limits, real tile load/error/pan lifecycle and provider/data attribution. Native hosts do not measure browser pixels.');
}finally{console.error=originalError;}
