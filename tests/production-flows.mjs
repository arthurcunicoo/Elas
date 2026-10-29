import * as reportClusters from '../features/map/reportClusters.ts';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';

// Actual services and React components; native hosts do not measure layout.
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const originalError = console.error;
console.error = (...args) => { if (!String(args[0]).includes('react-test-renderer is deprecated')) originalError(...args); };
const animations = [];
class Value { constructor(value) { this.value = value; } setValue(value) { this.value = value; } stopAnimation() {} interpolate() { return 0; } }
const animation = (_value, config) => { animations.push(config); return { start: callback => callback?.({ finished: true }), stop() {} }; };
const native = {
  View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator',
  StyleSheet: { create: x => x, absoluteFill: {}, absoluteFillObject: {} }, Platform: { OS: 'ios' },
  Animated: { Value, View: 'AnimatedView', Text: 'AnimatedText', createAnimatedComponent: () => 'AnimatedPressable', timing: animation, spring: animation },
  Easing: { cubic: x => x, out: x => x },
};
function load(file, mocks = {}, context = {}) {
  const code = ts.transpileModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 } }).outputText;
  const module = { exports: {} };
  const resolve = name => {
    if (name in mocks) return mocks[name];
    if (name === 'react') return React;
    if (name === 'react/jsx-runtime') return require(name);
    if (name === 'react-native') return native;
    if (name.endsWith('/constants/theme')) return theme;
    throw new Error('Unmocked import ' + name + ' in ' + file);
  };
  new Function('require','module','exports','__DEV__','process',code)(resolve,module,module.exports,context.dev ?? false,{ env: context.env ?? {} });
  return module.exports;
}
const theme = load('../constants/theme.ts');
const community = load('../constants/community.ts', { './theme': theme });
const method = "Política de teste: 70% favoráveis e 50% de atenção, com revisão comunitária.";
const empty = { classification: "unknown", policyVersion: 1, method, total: 0, minimum: 5, windowDays: 180, distribution: null, lastContribution: null };
const sample = (total = 5, counts = [4,0,1,0]) => ({ ...empty, total, classification: total < 5 ? "unknown" : (counts[2]+counts[3])/total >= .5 ? "attention" : counts[0]/total >= .7 ? "safe" : "moderate", distribution: Object.fromEntries(community.communityMoods.map((mood,i) => [mood,counts[i]])) });
const raw = (id,total = 0,counts) => ({ lugar_id: id, total, politica: {versao:1,metodo:method}, classificacao: total >= 5 ? sample(total,counts).classification : "unknown", minimo: 5, janela_dias: 180, distribuicao: total >= 5 ? sample(total,counts).distribution : null, ultima_contribuicao: null });
const place = { id: 'nereu', name: 'Praça Nereu Ramos', category: 'square', status: 'unknown', latitude: -28.68, longitude: -49.37 };
const rpc = [];
let result = ids => ids.map(id => raw(id));
const reviews = load('../services/communityReviews.ts', {
  '../constants/community': community,
  '../lib/supabase': { requireBackend: () => ({ rpc: async (name,args) => { rpc.push({name,args}); const rows=result(args.p_lugares); return { data: {politica:{versao:1,metodo:method},resumos:rows.map(({politica,...row})=>row)}, error: null }; } }) },
});
assert.equal(community.communityStatus(empty),'unknown');
assert.equal(community.communityStatus(sample()),'safe');
assert.equal(community.communityStatus(sample(10,[7,2,1,0])),'safe');
assert.equal(community.communityStatus(sample(10,[6,3,1,0])),'moderate');
assert.equal(community.communityStatus(sample(10,[3,2,3,2])),'attention');
assert.equal(community.communityStatus(sample(4,[4,0,0,0])),'unknown');
for (const payload of [null,{},[raw('a',-1)],[{...raw('a'),minimo:1}],[{...raw('a'),distribuicao:{Segura:1}}],[raw('a',5,[1,0,0,0])],[raw('a',5,[5.1,0,0,0])]]) assert.throws(() => reviews.parseReviewSummaries(payload));
// Client displays the classification and explanation from the backend, not its own thresholds.
const changed = {...raw('changed',8,[4,2,1,1]), minimo:8,janela_dias:90,classificacao:'safe',politica:{versao:2,metodo:'Regra publicada pelo backend: 50% favoráveis; janela de 90 dias.'}};
const parsedChanged=reviews.parseReviewSummaries([changed]).get('changed');
assert.equal(parsedChanged.minimum,8);assert.equal(parsedChanged.windowDays,90);assert.equal(community.communityStatus(parsedChanged),'safe');
assert.equal(parsedChanged.policyVersion,2);assert.equal(parsedChanged.method,changed.politica.metodo);
for(const corrupt of [{...changed,classificacao:'perigoso'},{...changed,politica:{versao:0,metodo:'x'}},{...changed,minimo:9},{...raw('a'),ultima_contribuicao:'2026-01-01'}]) assert.throws(()=>reviews.parseReviewSummaries([corrupt]));
const many = Array.from({length:601},(_,i) => ({...place,id:String(i)}));
assert.equal((await reviews.hydrateCommunity(many)).length,601);
assert.deepEqual(rpc.map(call=>call.args.p_lugares.length),[600,1]);
assert.ok(rpc.every(call=>call.name==='resumos_avaliacoes' && call.args.p_compacto===true));
result = ids => ids.map(id=>raw(id,5));
assert.equal((await reviews.hydrateCommunity([place]))[0].status,'safe');
result = () => [];
await assert.rejects(reviews.hydrateCommunity([place]),/indisponível/);
assert.deepEqual(reviews.unavailableCommunity([{...place,reviewSummary:sample(),status:'safe'}])[0],{...place,reviewSummary:undefined,reviewsUnavailable:true});

// Release builds cannot query examples, even if a presentation environment flag leaked into the build.
for (const [dev,flag,expected] of [[false,'1',false],[true,undefined,false],[true,'1',true]]) {
  const mode = load('../lib/appMode.ts',{}, {dev,env:{EXPO_PUBLIC_SHOWCASE:flag}});
  assert.equal(mode.showcaseEnabled,expected);
  let queried=0;
  const service=load('../services/showcase.ts',{'../lib/appMode':mode,'../lib/supabase':{supabase:{from:()=>{queried++;throw Error('Unexpected example read');}}}});
  if(!expected){assert.deepEqual(await service.listDemonstrations('evento'),[]);assert.equal(queried,0);}
}
const configMocks = mode => ({ './storage/protectedStorage':{protectedStorage:{}}, './appMode': {demoMode:mode}, 'react-native-url-polyfill/auto':{}, '@react-native-async-storage/async-storage':{}, '@supabase/supabase-js':{createClient:()=>({}),processLock:()=>{}}, './monitoring':{monitoredFetch:x=>x}, './request':{deadlineFetch:x=>x}, './errors':{friendlyError:String} });
assert.ok(load('../lib/supabase.ts',configMocks(false)).configError,'missing config must not silently enable demo');
assert.equal(load('../lib/supabase.ts',configMocks(true)).configError,'');

const backend = load('../services/backendSchema.ts',{'../lib/supabase':{requireBackend:()=>({rpc:async()=>({data:12,error:null})})}});
for(const [data,error,expected] of [[11,null,'available'],[12,null,'available'],[10,null,'incompatible'],[null,null,'unavailable'],[null,{message:'Failed to fetch'},'connection'],[null,{name:'AbortError'},'timeout'],[null,{status:503},'unavailable'],[null,{status:401},'session'],[null,{status:403},'permission'],[null,{code:'42501'},'permission'],[null,{code:'PGRST202'},'incompatible']]) assert.equal(backend.classifyBackend(data,error),expected);
assert.equal(await backend.checkBackendSchema(),'available');

let renderer;
const mount = async (element,options) => {await act(async()=>{renderer=TestRenderer.create(element,options);});};
const unmount=async()=>{await act(async()=>renderer.unmount());renderer=null;};
const text=()=>renderer.root.findAllByType('Text').map(n=>n.children.filter(v=>typeof v==='string').join('')).join(' ');
const touch = props => React.createElement('TouchFeedback',props,props.children);
try {
  const caches = load('../features/map/cache.ts');
  let account='a', catalog, reads=0, summary=sample(), failSummary=false, resolvePending;
  let factorReads = 0; const factorPending = [];
  const {CatalogProvider,useCatalog}=load('../features/map/CatalogProvider.tsx',{
    '../../lib/publicOffline':{publicOfflineStore:{save:async()=>{}}},
    '../../services/communityReviews':{hydrateCommunity:async places=>{
      if(failSummary)throw Error('offline');
      return places.map(item=>({...item,reviewSummary:summary,status:community.communityStatus(summary)}));
    },unavailableCommunity:reviews.unavailableCommunity},
    '../../constants/places':{initialMapRegion:{},places:[]},
    '../../lib/supabase':{friendlyError:String,backendConfigured:true},
    '../../services/reviews':{listReviewFactors:()=>{factorReads++;return new Promise((resolve,reject)=>factorPending.push({resolve,reject}));}},
    '../../services/places':{nearbyPlaces:async()=>{reads++;return {places:[place],warning:''};},resolvePlace:()=>new Promise(resolve=>{resolvePending=resolve;})},
    '../auth/SessionProvider':{useSession:()=>({session:{user:{id:account}}})},
    './cache':caches,'./region':{catalogRequestKey:()=> 'same-area',queryRegion:region=>region},
  });
  function Probe(){catalog=useCatalog();return null;}
  const catalogTree=()=>React.createElement(CatalogProvider,null,React.createElement(Probe));
  await mount(catalogTree());
  assert.equal(factorReads,0,'login/provider mount must not query factors');
  let factorsFirst, factorsSame;
  await act(async()=>{factorsFirst=catalog.ensureFactors();factorsSame=catalog.ensureFactors();});
  assert.equal(factorReads,1,'concurrent factor consumers share one request');
  assert.equal(factorsFirst,factorsSame);assert.equal(catalog.loading,true);
  await act(async()=>factorPending[0].resolve([{id:'light',nome:'Iluminação'}]));await factorsFirst;
  assert.equal(catalog.factors[0].id,'light');assert.equal(catalog.loading,false);assert.equal(reads,0,'factor loading must not fetch an unrelated map region');
  await act(async()=>catalog.ensureFactors());assert.equal(factorReads,1,'ready factors are reused');
  await act(async()=>catalog.loadNearby({}));assert.equal(catalog.places[0].status,'safe');
  const firstMarker=catalog.places[0];
  summary=JSON.parse(JSON.stringify(summary));
  await act(async()=>catalog.loadNearby({}));assert.equal(catalog.places[0],firstMarker,'unchanged summaries retain marker identity');
  summary=empty;await act(async()=>catalog.loadNearby({}));
  assert.equal(reads,1,'catalog data can stay cached while community summaries refresh');
  assert.equal(catalog.places[0].reviewSummary.total,0,'a removed/edited review must not stay public in the area cache');
  failSummary=true;await act(async()=>catalog.loadNearby({}));
  assert.equal(catalog.places[0].reviewsUnavailable,true);assert.equal(catalog.places[0].reviewSummary,undefined,'failed reads must not show a misleading zero or old favorable status');
  let stale;await act(async()=>{stale=catalog.ensurePlace('other-place');});
  let oldFactors;await act(async()=>{oldFactors=catalog.ensureFactors(true);});
  account='b';await act(async()=>renderer.update(catalogTree()));
  await act(async()=>resolvePending({...place,id:'other-place',reviewSummary:sample()}));await stale;
  assert.equal(catalog.places.length,0,'previous account place requests cannot refill the current catalog');
  await act(async()=>factorPending[1].resolve([{id:'old',nome:'Old account'}]));await oldFactors;
  assert.equal(catalog.factors.length,0,'late factors from the previous account must be discarded');
  let freshFactors;await act(async()=>{freshFactors=catalog.ensureFactors();});
  await act(async()=>factorPending[2].reject(Error('offline')));await freshFactors;
  assert.ok(catalog.error.includes('offline'));assert.equal(catalog.loading,false);
  await act(async()=>{freshFactors=catalog.reload();});
  await act(async()=>factorPending[3].resolve([{id:'new',nome:'Nova conta'}]));await freshFactors;
  assert.equal(catalog.factors[0].id,'new');assert.equal(catalog.error,'');
  await unmount();

  let user='a'; const pending=[];
  const {SchemaGate}=load('../features/auth/SchemaGate.tsx',{
    '../map/OfflinePlaces':{OfflinePlaces:props=>React.createElement('OfflinePlaces',props)},
    '../../components/loading/LoadingState':{LoadingState:props=>React.createElement('LoadingState',props)},
    '../../services/account':{signOut:async()=>{}},
    '../../services/backendSchema':{...backend,checkBackendSchema:()=>new Promise(resolve=>pending.push(resolve))},
    '../reports/drafts':{clearAccountDrafts:async()=>{}},
    '../../components/shared/FeaturePage':{Action:props=>React.createElement('Action',props),shared:{}},
    './SessionProvider':{useSession:()=>({session:{user:{id:user}}})},
    '../../lib/supabase':{friendlyError:String,backendConfigured:true,requireBackend:()=>({auth:{signOut:async()=>({error:null})}})},
  });
  const gate=()=>React.createElement(SchemaGate,null,React.createElement('Text',null,'APP'));
  await mount(gate()); user='b'; await act(async()=>renderer.update(gate()));
  await act(async()=>pending[0]('available'));
  assert.ok(!text().includes('APP'),'old account schema request cannot unlock new account');
  await act(async()=>pending[1]('connection'));
  assert.ok(text().includes('Não foi possível conectar'));
  assert.ok(!text().includes('atualização'),'network failure is not an incompatible database');
  await act(async()=>renderer.root.findAllByType('Action').find(node=>node.props.title==='Consultar lugares salvos offline').props.onPress());
  const offlinePanel=renderer.root.findByType('OfflinePlaces');
  assert.equal(offlinePanel.props.owner,'b');
  assert.ok(!text().includes('APP'),'offline must never unlock the protected application');
  await act(async()=>offlinePanel.props.onReconnect());
  await act(async()=>pending[2]('available'));assert.equal(text(),'APP');await unmount();
  for(const blocked of ['permission','incompatible','session']){
    await mount(gate());
    await act(async()=>pending.at(-1)(blocked));
    assert.equal(renderer.root.findAllByType('Action').some(node=>node.props.title==='Consultar lugares salvos offline'),false,'offline must not bypass '+blocked);
    assert.ok(!text().includes('APP'));await unmount();
  }

  const {TouchFeedback}=load('../components/TouchFeedback.tsx',{'../constants/theme':theme,'../hooks/useReducedMotion':{useReducedMotion:()=>false}});
  let pressed=0;
  await mount(React.createElement(TouchFeedback,{label:'Ação',onPress:()=>pressed++}));
  renderer.root.findByType('AnimatedPressable').props.onPress();assert.equal(pressed,1,'action executes synchronously');
  for(const state of [{disabled:true},{busy:true}]){
    await act(async()=>renderer.update(React.createElement(TouchFeedback,{label:'Ação',onPress:()=>pressed++,...state})));
    renderer.root.findByType('AnimatedPressable').props.onPress();assert.equal(pressed,1);
  }await unmount();

  let focus;
  const {MotionReveal}=load('../components/MotionReveal.tsx',{'../hooks/useReducedMotion':{useReducedMotion:()=>false},'expo-router':{useFocusEffect:effect=>{focus=effect;React.useEffect(effect,[effect]);}}});
  const start=animations.length;
  await mount(React.createElement(MotionReveal,{delay:1800,duration:620},React.createElement('Text',null,'Content')));
  assert.equal(animations.at(-1).duration,350);assert.equal(animations.at(-1).delay,180);
  await act(async()=>focus());assert.equal(animations.length,start+1,'returning focus does not replay the reveal');await unmount();

  const {CommunityReviewSummary}=load('../components/map/CommunityReviewSummary.tsx',{'../loading/LoadingIndicator':{LoadingIndicator:props=>React.createElement('LoadingIndicator',props)},'../../constants/community':community,'../../constants/theme':theme,'../TouchFeedback':{TouchFeedback:touch}});
  await mount(React.createElement(CommunityReviewSummary,{summary:sample(),expanded:true,onExpand(){}}));
  assert.ok(text().includes('5 avaliações aprovadas nos últimos 180 dias'));
  assert.ok(text().includes('Comentários e autoria ficam privados'));
  assert.ok(!text().includes('demonstração'));
  assert.equal(renderer.root.findAll(n=>n.type==='View'&&n.props.accessibilityLabel?.includes('por cento')).length,4);
  await act(async()=>renderer.root.findAll(n=>n.type==='TouchFeedback'&&n.props.label==='Como o resumo é calculado')[0].props.onPress());
  assert.ok(text().includes('70%'));assert.ok(text().includes('50%'));
  await act(async()=>renderer.update(React.createElement(CommunityReviewSummary,{summary:empty,expanded:true,onExpand(){}})));
  assert.ok(text().includes('ainda não tem avaliações aprovadas'));await unmount();

  const {ParticipationSheet}=load('../components/ParticipationSheet.tsx',{'./icons/Ionicon':{default:'Icon'},'./AppSheet':{AppSheet:props=>React.createElement('AppSheet',props,props.children)},'./TouchFeedback':{TouchFeedback:touch},'../constants/theme':theme});
  const chosen=[];await mount(React.createElement(ParticipationSheet,{visible:true,placeName:place.name,onClose(){},onChoose:kind=>chosen.push(kind)}));
  assert.equal(renderer.root.findByType('AppSheet').props.subtitle,place.name);
  for(const node of renderer.root.findAllByType('TouchFeedback'))await act(async()=>node.props.onPress());
  assert.deepEqual(chosen,['review','report']);
  const choices = renderer.root.findAllByType('TouchFeedback');
  assert.ok(choices.every(node => node.findAllByType('TouchFeedback').length === 1), 'report and review must never be nested buttons');await unmount();

  // Selecting a city report preserves the user's zoom and does not recenter on map callbacks.
  const moved=[];let redrawn=0;
  const CityMap=load('../components/map/CityMap.native.tsx',{
    '../../constants/community':community,'../../constants/placeRelevance':{visibleMapPlaces:places=>places},
    'react-native-maps':{default:'MapView',Marker:'Marker'},'../../features/map/reportClusters':reportClusters,'./ReportMarker':{ReportMarker:'ReportMarker'},'../../constants/places':{initialMapRegion:{latitudeDelta:.04,longitudeDelta:.04}},
    '../../constants/placeCategories':{groupMapPoints:places=>places.map(p=>({...p,id:p.id,places:[p]}))},
    './PlaceMarker':{PlaceMarker:'PlaceMarker'},'../../hooks/useReducedMotion':{useReducedMotion:()=>true},'./MapAttribution':{MapAttribution:()=>null},
  }).default;
  const region={latitude:-28.68,longitude:-49.37,latitudeDelta:.001,longitudeDelta:.002};
  const props={places:[place],reports:[],region,bottomInset:0,topInset:0,locationRequest:0,onSelect(){},onSelectGroup(){},onClear(){},onSelectReport(){},onRegionChange(){},locationEnabled:false};
  await mount(React.createElement(CityMap,props),{createNodeMock:node=>node.type==='MapView'?{animateToRegion:target=>moved.push(target)}:node.type==='Marker'?{redraw:()=>redrawn++}:{}});
  const report={id:'report',latitude:-28.67,longitude:-49.36};
  await act(async()=>renderer.update(React.createElement(CityMap,{...props,selectedReport:report})));
  assert.equal(moved.length,1);assert.equal(moved[0].latitudeDelta,region.latitudeDelta);assert.equal(moved[0].longitudeDelta,region.longitudeDelta);
  await act(async()=>renderer.update(React.createElement(CityMap,{...props,selectedReport:report,region:{...region,latitude:-28.66}})));
  assert.equal(moved.length,1,'panning while a report remains selected must not force recentering');
  const before=redrawn;
  await act(async()=>renderer.update(React.createElement(CityMap,{...props,places:[{...place,status:'safe',reviewSummary:sample()}]})));
  assert.ok(redrawn>before,'a changed community count/status must refresh the native marker bitmap');
  assert.ok(renderer.root.findByType('Marker').props.accessibilityLabel.includes('5 avaliações aprovadas'));await unmount();

  console.log('Production flow checks passed: bounded real summary contracts, thresholds, no release samples, explicit demo config, schema/network/account separation, immediate presses, short reveal once, real distribution UI, participation choice and native report zoom/marker refresh.');
} finally { if(renderer)await unmount();console.error=originalError; }
