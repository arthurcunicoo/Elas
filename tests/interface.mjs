import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer,{act} from 'react-test-renderer';
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),cache=new Map();
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const original=console.error;console.error=(...a)=>{if(!String(a[0]).includes('react-test-renderer is deprecated'))original(...a);};
let reduced=false,fontScale=1,renderer;
const timings=[];
class Value{constructor(value){this.value=value;}setValue(value){this.value=value;}stopAnimation(){}interpolate(){return 0;}}
const native={View:'View',Text:'Text',ScrollView:'ScrollView',TextInput:'TextInput',ActivityIndicator:'ActivityIndicator',Platform:{OS:'web'},useWindowDimensions:()=>({width:320,height:568,fontScale}),StyleSheet:{create:x=>x},
 Animated:{Value,createAnimatedComponent:()=> 'Pressable',timing:(_v,c)=>{timings.push(c);return{start(){}};},spring:()=>({start(){}})},
};
const mocks={
 'components/icons/Ionicon.tsx':{default:'Icon'},
 'hooks/useReducedMotion.ts':{useReducedMotion:()=>reduced},
 'components/loading/CityPulse.tsx':{CityPulse:p=>React.createElement('CityPulse',p)},
 'components/Logo.tsx':{Logo:'Logo'},
 'components/shared/FeaturePage.tsx':{Field:p=>React.createElement('Field',p),shared:{label:{},chip:{},note:{}}},
 'features/reports/records.ts':{statusLabels:{pendente:'Aguardando verificação',verificado:'Verificado',resolvido:'Resolvido',solicitada:'Solicitada',em_andamento:'Em andamento',concluida:'Concluída',aprovada:'Aprovada',rejeitada:'Rejeitada'}},
};
function load(relative){if(relative in mocks)return mocks[relative];if(cache.has(relative))return cache.get(relative).exports;const file=path.join(root,relative),module={exports:{}};cache.set(relative,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 new Function('require','module','exports',code)(n=>{if(n==='react')return React;if(n==='react/jsx-runtime')return require(n);if(n==='react-native')return native;if(n in mocks)return mocks[n];assert.ok(n.startsWith('.'),n);const base=path.resolve(path.dirname(file),n),candidate=[base,base+'.ts',base+'.tsx'].find(f=>fs.existsSync(f)&&fs.statSync(f).isFile());assert.ok(candidate,n);return load(path.relative(root,candidate));},module,module.exports);return module.exports;
}
const mount=async element=>act(async()=>{renderer=TestRenderer.create(element);}),unmount=async()=>act(async()=>renderer.unmount());
const flatten=style=>Object.assign({},...[style].flat(Infinity).filter(Boolean));
const text=()=>renderer.root.findAllByType('Text').map(n=>n.children.filter(x=>typeof x==='string').join('')).join(' ');
try{
 const {CollectionState,collectionFailure}=load('components/shared/CollectionState.tsx');
 let retried=0,cleared=0;
 const state=props=>React.createElement(CollectionState,{loading:false,title:'Sem favoritos',message:'Salve lugares no mapa.',onRetry:()=>retried++,onClear:()=>cleared++,...props});
 await mount(state({loading:true}));assert.equal(renderer.root.findAllByType('CityPulse').length,1);assert.equal(renderer.root.findByProps({accessibilityRole:'progressbar'}).props.accessibilityState.busy,true);assert.ok(!text().includes('Sem favoritos'));
 await act(async()=>renderer.update(state({})));assert.ok(text().includes('Sem favoritos'));assert.equal(renderer.root.findAllByProps({accessibilityRole:'alert'}).length,0);assert.equal(renderer.root.findAllByType('Pressable').length,1,'empty state offers clear, not an irrelevant retry');
 await act(async()=>renderer.root.findByType('Pressable').props.onPress());assert.equal(cleared,1);
 await act(async()=>renderer.update(state({error:'Failed to fetch'})));assert.ok(text().includes('Não conseguimos conectar'));assert.equal(renderer.root.findAllByProps({accessibilityRole:'alert'}).length,1);
 await act(async()=>renderer.root.findByProps({accessibilityLabel:'Tentar novamente'}).props.onPress());assert.equal(retried,1);
 await act(async()=>renderer.update(state({error:'select secret_token from private.users'})));assert.ok(!text().includes('secret_token'));
 assert.equal(collectionFailure('Sua conta não tem permissão').title,'Acesso não permitido');assert.equal(collectionFailure('Confirme sua sessão').title,'Entre novamente');await unmount();

 const {TouchFeedback}=load('components/TouchFeedback.tsx');let presses=0;
 await mount(React.createElement(TouchFeedback,{label:'Abrir',onPress:()=>presses++},React.createElement('Text',null,'Abrir')));
 await act(async()=>renderer.root.findByType('Pressable').props.onFocus());assert.equal(flatten(renderer.root.findByType('Pressable').props.style).outlineWidth,2);
 await act(async()=>renderer.root.findByType('Pressable').props.onBlur());assert.equal(flatten(renderer.root.findByType('Pressable').props.style).outlineWidth,undefined);
 reduced=true;await act(async()=>renderer.update(React.createElement(TouchFeedback,{label:'Abrir',onPress:()=>presses++})));
 const count=timings.length;await act(async()=>renderer.root.findByType('Pressable').props.onPressIn());assert.equal(timings.length,count,'reduced motion uses immediate press feedback');
 await act(async()=>renderer.update(React.createElement(TouchFeedback,{label:'Abrir',onPress:()=>presses++,busy:true})));
 await act(async()=>renderer.root.findByType('Pressable').props.onPress());assert.equal(presses,0);assert.equal(renderer.root.findByType('Pressable').props.accessibilityState.busy,true);await unmount();

 const {Field}=load('components/shared/FormControls.tsx');fontScale=1.6;
 await mount(React.createElement(Field,{label:'Senha',password:true,value:'',error:'Informe sua senha.'}));
 const input=renderer.root.findByType('TextInput');assert.equal(input.props['aria-invalid'],true);assert.ok(flatten(input.props.style).minHeight>=64);
 const eye=renderer.root.findByProps({accessibilityLabel:'Mostrar senha'});assert.equal(flatten(eye.props.style).height,48);assert.equal(flatten(eye.props.style).bottom,undefined);
 assert.ok(renderer.root.findAllByProps({accessibilityRole:'alert'}).length);await unmount();

 const {AdminFilters}=load('features/admin/AdminFilters.tsx');let query='Centro',status='pendente',kind='relato',globalClears=0;
 const filters=()=>React.createElement(AdminFilters,{admin:false,kind,query,status,busy:false,onQuery:v=>query=v,onStatus:v=>status=v,onKind:v=>kind=v,onClear:()=>{globalClears++;query='';status='';}});
 await mount(filters());assert.ok(!text().includes('Cadastros'));assert.ok(text().includes('Filtros ativos'));
 await act(async()=>renderer.root.findByProps({accessibilityLabel:'Remover busca: Centro'}).props.onPress());assert.equal(query,'');assert.equal(status,'pendente');
 await act(async()=>renderer.update(filters()));
 await act(async()=>renderer.root.findByProps({accessibilityLabel:'Limpar todos os filtros'}).props.onPress());assert.equal(globalClears,1);assert.equal(status,'');await unmount();
 // Real admin screen retains filters while opening details; no query/auth contract changes.
 let sentFilters,route;
 native.FlatList=p=>React.createElement('FlatList',p,p.ListHeaderComponent,p.data.map(item=>React.createElement(React.Fragment,{key:item.id},p.renderItem({item}))),p.ListEmptyComponent,p.ListFooterComponent);
 const page=mocks['components/shared/FeaturePage.tsx'];
 page.FeaturePage=p=>React.createElement('Page',p,p.children);page.Message=()=>null;page.Action=p=>React.createElement('Action',p);
 let currentRole='admin',summaryReads=0;
 mocks['features/profile/ProfileProvider.tsx']={useProfile:()=>({role:currentRole})};
 mocks['features/profile/usePagedList.ts']={usePagedList:loader=>{sentFilters=loader;return {rows:[{id:'x',titulo:'Praça',criado_em:'2026-10-01',status:'pendente',lugar_id:'place'}],error:'',loading:false,hasMore:false,refresh(){},more(){}};}};
 mocks['features/reports/HistoryList.tsx']={HistoryList:()=>null};
 mocks['lib/supabase.ts']={friendlyError:()=> 'Não foi possível concluir.'};
 mocks['features/admin/admin.ts']={adminSummary:async()=>{summaryReads++;return {};},adminList:async(...args)=>args,moderate:async()=>{},classify:async()=>{}};
 // The resolver handles this external module only for the mounted screen test.
 mocks['expo-router']={router:{push:value=>{route=value;}},useFocusEffect:fn=>React.useEffect(fn,[fn])};
 const {default:AdminScreen}=load('features/admin/AdminScreen.tsx');
 await mount(React.createElement(AdminScreen));
 await act(async()=>renderer.root.findByType(AdminFilters).props.onQuery('Praça'));
 await act(async()=>renderer.root.findAllByType('Action').find(n=>n.props.title==='Revisar cadastro do lugar vinculado').props.onPress());
 assert.equal(route.pathname,'/admin-lugar');
 assert.ok(renderer.root.findAllByType('View').every(node=>node.children.every(child=>typeof child!=='string')),'native View containers cannot contain raw text, including literal spaces');
 await act(async()=>renderer.update(React.createElement(AdminScreen)));
 assert.equal(renderer.root.findByType(AdminFilters).props.query,'Praça');
 await act(async()=>renderer.root.findByType(AdminFilters).props.onClear());assert.equal(renderer.root.findByType(AdminFilters).props.status,'');assert.equal((await sentFilters(null))[2],'');await unmount();
 for(const role of ['usuario','moderador',null,undefined,'owner']){
  currentRole=role;sentFilters=null;const reads=summaryReads;
  await mount(React.createElement(AdminScreen));
  assert.equal(renderer.root.findAllByType(AdminFilters).length,0,'unauthorized screen cannot mount admin content');
  assert.equal(sentFilters,null,'unauthorized screen cannot load a moderation list');
  assert.equal(summaryReads,reads,'unauthorized screen cannot load admin totals');
  await unmount();
 }
 const {palette}=load('constants/theme.ts');
 const luminance=hex=>hex.slice(1).match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=0.04045?x/12.92:((x+0.055)/1.055)**2.4).reduce((sum,x,i)=>sum+x*[0.2126,0.7152,0.0722][i],0);
 for(const ink of [palette.text,palette.muted,palette.brand]){const a=luminance(ink),b=luminance(palette.surface);assert.ok((Math.max(a,b)+0.05)/(Math.min(a,b)+0.05)>=4.5,'shared body text contrast on surface');}
 console.log('Interface checks passed: loading/empty/network/server/permission/session states, safe copy, retry/clear, keyboard focus, disabled actions, reduced motion, font 160%, password geometry, filter scope and independent/global clearing. Native hosts do not prove device layout or screen-reader behavior.');
}finally{console.error=original;}
