process.env.EXPO_PUBLIC_MAP_TILE_MODE = 'pilot';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import React from 'react';
import ts from 'typescript';
import TestRenderer,{act} from 'react-test-renderer';
import {queryRegion,catalogRequestKey,reportZoom} from '../features/map/region.ts';
import {nodesWithSelection,reportClusterRegion,reportNodeLabel} from '../features/map/reportClusters.ts';
import {RegionRequestCache} from '../features/map/cache.ts';
const region={latitude:-28.6784,longitude:-49.3694,latitudeDelta:.016,longitudeDelta:.016};
assert.equal(catalogRequestKey(region),catalogRequestKey({...region,latitude:region.latitude+.00001}));
assert.notEqual(catalogRequestKey(region),catalogRequestKey({...region,latitudeDelta:.008,longitudeDelta:.008}));
// The quantized request covers every original edge, including centres near a bucket boundary.
for(let i=0;i<2000;i++){
 const r={latitude:-60+(i%997)*.1,longitude:-120+(i%1499)*.1,latitudeDelta:.0001*(1+i%1900),longitudeDelta:.00011*(1+i%1700)},q=queryRegion(r);
 assert.ok(q.latitude-q.latitudeDelta/2<=r.latitude-r.latitudeDelta/2+1e-10);assert.ok(q.latitude+q.latitudeDelta/2>=r.latitude+r.latitudeDelta/2-1e-10);
 assert.ok(q.longitude-q.longitudeDelta/2<=r.longitude-r.longitudeDelta/2+1e-10);assert.ok(q.longitude+q.longitudeDelta/2>=r.longitude+r.longitudeDelta/2-1e-10);
}
const cluster={id:'cluster',count:431,latitude:region.latitude,longitude:region.longitude,bounds:{south:region.latitude,north:region.latitude,west:region.longitude,east:region.longitude},report:null};
assert.equal(reportClusterRegion(cluster,region),null,'coincident occurrences need a list instead of endless zoom');
const spread={...cluster,bounds:{...cluster.bounds,south:region.latitude-.001,north:region.latitude+.001}};
assert.ok(reportClusterRegion(spread,region).latitudeDelta<region.latitudeDelta);
const report={id:'one',categoria:'Iluminação',local_texto:'Centro',latitude:region.latitude,longitude:region.longitude,status:'pendente'};
assert.equal(nodesWithSelection([cluster],report).length,2);assert.equal(nodesWithSelection(nodesWithSelection([cluster],report),report).length,2);
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),cache=new Map(),timers=new Map();let timerId=0;
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const originalError=console.error;console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
const schedule=(fn,ms)=>{const id=++timerId;timers.set(id,{fn,ms});return id;},clear=id=>timers.delete(id);
const flush=async()=>act(async()=>{for(const[id,t]of[...timers])if(t.ms<=400){timers.delete(id);t.fn();}await Promise.resolve();await Promise.resolve();});
class Value{constructor(value){this.value=value;}setValue(value){this.value=value;}interpolate(){return 0;}}
const animation=()=>({start:fn=>fn?.({finished:true}),stop(){}});
const native={View:'View',Text:'Text',Image:'Image',Pressable:'Pressable',StyleSheet:{create:x=>x,absoluteFill:{}},Platform:{OS:'web'},Easing:{out:x=>x,cubic:x=>x},Animated:{Value,View:'AnimatedView',timing:animation},PanResponder:{create:x=>({panHandlers:x})}};
const moves=[],groups=[],selection=[],clears=[];let user='A',pending=[],probe;
const mock={
 'react':React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,'react-native-maps':{default:'MapView',Marker:'Marker'},
 'expo-router':{useFocusEffect:fn=>React.useEffect(fn,[fn])},
};
const modules={
 'components/icons/Ionicon.tsx':{default:'Icon'},'components/map/PlaceMarker.tsx':{PlaceMarker:()=>null},'components/map/MapAttribution.tsx':{MapAttribution:()=>null},
 'hooks/useReducedMotion.ts':{useReducedMotion:()=>true},'components/TouchFeedback.tsx':{TouchFeedback:p=>React.createElement('TouchFeedback',p,p.children)},
 'features/auth/SessionProvider.tsx':{useSession:()=>({session:{user:{id:user}}})},
 'lib/supabase.ts':{backendConfigured:true,friendlyError:e=>e.message},
 'services/reports.ts':{mapReports:(area,zoom,signal)=>new Promise((resolve,reject)=>pending.push({area,zoom,signal,user,resolve,reject})),findReport:async()=>null},
 'features/map/cache.ts':{RegionRequestCache},
};
function load(relative){if(relative in modules)return modules[relative];if(cache.has(relative))return cache.get(relative).exports;
 const file=path.join(root,relative),module={exports:{}};cache.set(relative,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const resolve=name=>{if(name in mock)return mock[name];if(!name.startsWith('.'))throw Error('Unmocked import '+name);const base=path.resolve(path.dirname(file),name),candidate=[base+'.ts',base+'.tsx',base+'.js'].find(p=>fs.existsSync(p));assert.ok(candidate,name);return load(path.relative(root,candidate));};
 new Function('require','module','exports','setTimeout','clearTimeout','requestAnimationFrame','cancelAnimationFrame',code)(resolve,module,module.exports,schedule,clear,fn=>schedule(fn,16),clear);return module.exports;
}
let renderer;const mount=async element=>act(async()=>{renderer=TestRenderer.create(element,{createNodeMock:n=>n.type==='MapView'?{animateToRegion:next=>moves.push(next)}:n.type==='Marker'?{redraw(){}}:{}});});
const unmount=async()=>act(async()=>renderer.unmount());
try{
 const props={places:[],selected:null,onSelect(){},onSelectGroup(){},onClear:()=>clears.push(true),reportNodes:[cluster],areaName:'Cidade configurada',homeRegion:region,selectedReport:null,onSelectReport:r=>selection.push(r),onOpenReportGroup:n=>groups.push(n),locationEnabled:false,userLocation:null,onLocation(){},region,bottomInset:0,topInset:0,locationRequest:0,onRegionChange:next=>moves.push(next)};
 const Web=load('components/map/CityMap.tsx').default;
 await mount(React.createElement(Web,props));
 await act(async()=>renderer.root.findAll(n=>n.type==='View'&&n.props.onLayout)[0].props.onLayout({nativeEvent:{layout:{width:390,height:700}}}));
 const label=reportNodeLabel(cluster,false);const pin=renderer.root.findAll(n=>n.type==='Pressable'&&n.props.accessibilityLabel===label)[0];assert.ok(pin);await act(async()=>pin.props.onPress());assert.equal(groups.at(-1).count,431);
 assert.ok(renderer.root.findAllByType('Icon').some(n=>n.props.name==='document-text-outline'));
 await unmount();native.Platform.OS='ios';
 const Native=load('components/map/CityMap.native.tsx').default;await mount(React.createElement(Native,props));
 const nativePin=renderer.root.findAll(n=>n.type==='Marker'&&n.props.accessibilityLabel===label)[0];assert.ok(nativePin);await act(async()=>nativePin.props.onPress({stopPropagation(){}}));assert.equal(groups.length,2);await unmount();
 await mount(React.createElement(Native,{...props,reportNodes:[spread]}));
 await act(async()=>renderer.root.findAll(n=>n.type==='Marker'&&n.props.accessibilityLabel===reportNodeLabel(spread))[0].props.onPress({stopPropagation(){}}));
 assert.ok(moves.at(-1).latitudeDelta<region.latitudeDelta);await unmount();
 const {useMapReports}=load('features/map/useMapReports.ts');let current=region;
 function Probe(){probe=useMapReports(current);return null;}
 await mount(React.createElement(Probe));await flush();assert.equal(pending.length,1);
 current={...region,latitude:region.latitude+.00001};await act(async()=>renderer.update(React.createElement(Probe)));await flush();assert.equal(pending.length,1,'same bucket shares request geometry');
 user='B';await act(async()=>renderer.update(React.createElement(Probe)));await flush();assert.equal(pending.length,2);assert.equal(pending[0].signal.aborted,true,'account switch cancels the old network request');
 await act(async()=>pending[0].resolve({total:431,nodes:[cluster]}));assert.equal(probe.total,0,'old account response cannot populate a new map');
 await act(async()=>pending[1].resolve({total:431,nodes:[cluster]}));assert.equal(probe.nodes[0].count,431);
 current={...region,longitudeDelta:.008,latitudeDelta:.008};await act(async()=>renderer.update(React.createElement(Probe)));await flush();assert.equal(pending.length,3);assert.notEqual(pending[1].area.longitudeDelta,pending[2].area.longitudeDelta);
 await act(async()=>pending[2].reject(Error('Conexão indisponível')));assert.ok(probe.error.includes('Conexão'));await act(async()=>probe.retry());await flush();assert.equal(pending.length,4);await act(async()=>pending[3].resolve({total:0,nodes:[]}));assert.equal(probe.error,'');await unmount();
 console.log('Spatial UI checks passed: 2000 padded-geometry samples, same-bucket reuse and zoom separation, shared web/native symbol and actions, coincident group drill-down, selected pin dedupe, stale/account response isolation and retry. Native hosts do not measure real device layout.');
}finally{console.error=originalError;}
