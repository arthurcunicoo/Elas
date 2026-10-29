import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
// Real screens/hooks, simulated native hosts: scope, routing and races, not device layout.
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
const require=createRequire(import.meta.url),root=path.resolve(import.meta.dirname,'..'),cache=new Map();
const originalError=console.error;console.error=(...args)=>{if(!String(args[0]).includes('react-test-renderer is deprecated'))originalError(...args);};
const native={Text:'Text',View:'View',ScrollView:'ScrollView',RefreshControl:'RefreshControl',KeyboardAvoidingView:'KeyboardAvoidingView',Platform:{OS:'ios'},StyleSheet:{create:x=>x},
 FlatList:p=>React.createElement('FlatList',p,p.ListHeaderComponent,p.data.length?p.data.map((item,index)=>React.createElement(React.Fragment,{key:p.keyExtractor(item)},p.renderItem({item,index}))):p.ListEmptyComponent,p.ListFooterComponent),
};
let user='A',rows=[],requests=[];const navigation=[];
const emptyImpacts=()=>({minhas:{rows:[],counts:{solicitada:0,em_andamento:0,concluida:0}},cidade:{rows:[],counts:{em_andamento:0,concluida:0}}});
const touch=p=>React.createElement('TouchFeedback',p,p.children);
const modules={
 'hooks/useServiceTimeZone.ts':{useServiceTimeZone:()=> 'America/Sao_Paulo'},
 'components/shared/CollectionState.tsx':{CollectionState:props=>React.createElement('CollectionState',props)},
 'components/shared/PageHeader.tsx':{PageHeader:p=>React.createElement('Header',p,React.createElement('Text',null,p.title),p.children)},
 'components/shared/FeaturePage.tsx':{FeaturePage:p=>React.createElement('Page',p,React.createElement('Text',null,p.title),p.children),Message:()=>null,shared:{}},
 'components/TouchFeedback.tsx':{TouchFeedback:touch},
 'components/ProfileDialog.tsx':{ProfileDialog:()=>null},
 'components/icons/Ionicon.tsx':{default:'Icon'},
 'components/impacts/ImpactStatCard.tsx':{ImpactStatCard:p=>React.createElement('Stat',p)},
 'components/impacts/ImprovementRequest.tsx':{ImprovementRequest:()=>null},
 'features/auth/SessionProvider.tsx':{useSession:()=>({session:user?{user:{id:user}}:null})},
 'features/profile/usePagedList.ts':{usePagedList:()=>({rows,loading:false,error:'',refresh(){},more(){}})},
 'components/loading/LoadingState.tsx':{LoadingState:props=>React.createElement('LoadingState',props)},
 'components/loading/LoadingIndicator.tsx':{LoadingIndicator:props=>React.createElement('LoadingIndicator',props)},
 'features/reports/HistoryList.tsx':{HistoryList:()=>null},
 'services/improvements.ts':{emptyImpacts,listImprovements:()=>new Promise((resolve,reject)=>requests.push({user,resolve,reject}))},
 'services/reports.ts':{listReports(){}},
 'lib/supabase.ts':{friendlyError:e=>e.message},
};
const external={'react':React,'react/jsx-runtime':require('react/jsx-runtime'),'react-native':native,'expo-status-bar':{StatusBar:()=>null},
 'expo-router':{router:{push:target=>navigation.push(target),navigate:target=>navigation.push(target)},useFocusEffect:fn=>React.useEffect(fn,[fn])}};
function load(relative){if(relative in modules)return modules[relative];if(cache.has(relative))return cache.get(relative).exports;
 const file=path.join(root,relative),module={exports:{}};cache.set(relative,module);
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2022}}).outputText;
 const resolve=name=>{if(name in external)return external[name];if(!name.startsWith('.'))throw Error('Unmocked import '+name);const base=path.resolve(path.dirname(file),name),candidate=[base+'.ts',base+'.tsx'].find(p=>fs.existsSync(p));assert.ok(candidate,name);return load(path.relative(root,candidate));};
 new Function('require','module','exports',code)(resolve,module,module.exports);return module.exports;
}
let renderer;
const mount=async Component=>act(async()=>{renderer=TestRenderer.create(React.createElement(Component));});
const unmount=async()=>act(async()=>renderer.unmount());
const text=()=>renderer.root.findAllByType('Text').map(n=>n.children.filter(x=>typeof x==='string').join('')).join(' ');
const press=async label=>act(async()=>renderer.root.findAll(n=>n.type==='TouchFeedback'&&n.props.label===label)[0].props.onPress());
try{
 const Impacts=load('app/impactos.tsx').default;
 await mount(Impacts);assert.equal(requests.length,1);
 user='B';await act(async()=>renderer.update(React.createElement(Impacts)));assert.equal(requests.length,2);
 const resultA={...emptyImpacts(),examples:[]};resultA.minhas.rows=[{id:'private-a',titulo:'Pedido privado A',descricao:'Não deve aparecer',status:'solicitada',propria:true}];
 await act(async()=>requests[0].resolve(resultA));assert.ok(!text().includes('Pedido privado A'));
 const resultB={...emptyImpacts(),examples:[]};resultB.minhas.counts={solicitada:2,em_andamento:1,concluida:0};resultB.cidade.counts={em_andamento:12,concluida:30};
 resultB.minhas.rows=[{id:'private-b',titulo:'Pedido privado B',descricao:'Meu pedido em análise',status:'solicitada',propria:true}];
 resultB.cidade.rows=[{id:'public',titulo:'Melhoria da comunidade',descricao:'Obra entregue',status:'concluida',propria:false}];
 await act(async()=>requests[1].resolve(resultB));assert.ok(text().includes('Pedido privado B'));assert.ok(text().includes('Sua solicitação'));assert.ok(text().includes('Melhoria pública da cidade'));
 assert.deepEqual(renderer.root.findAllByType('Stat').map(n=>[n.props.status,n.props.total]),[['solicitada',2],['em_andamento',1],['concluida',0],['em_andamento',12],['concluida',30]]);
 await press('Ver todas as minhas solicitações');assert.equal(navigation.at(-1),'/minhas-solicitacoes');await press('Ver histórico público de melhorias');assert.equal(navigation.at(-1),'/historico-impactos');
 user=null;await act(async()=>renderer.update(React.createElement(Impacts)));assert.ok(!text().includes('Pedido privado B'));assert.equal(requests.length,2,'sign-out must not request authenticated data');await unmount();
 user='C';await mount(Impacts);
 const presentation={...emptyImpacts(),examples:Array.from({length:9},(_,i)=>({id:'demo:impact:'+i,titulo:'Impacto de exemplo '+i,descricao:'Descrição fictícia',estado:['solicitada','em_andamento','concluida'][i%3]}))};
 await act(async()=>requests.at(-1).resolve(presentation));
 assert.ok(text().includes('Acompanhamento de exemplo'));assert.ok(text().includes('números fictícios'));
 assert.deepEqual(renderer.root.findAllByType('Stat').map(n=>n.props.total),[3,3,3]);
 assert.equal(presentation.minhas.counts.solicitada,0,'presentation never mutates real personal totals');
 await unmount();user=null;
 const Reports=load('app/alertas.tsx').default;await mount(Reports);assert.ok(text().includes('Relatos'));await press('Notificações');assert.equal(navigation.at(-1),'/notificacoes');await press('Meus relatos');assert.equal(navigation.at(-1),'/meus-relatos');await unmount();
 const {OwnRecordsScreen}=load('features/reports/OwnRecordsScreen.tsx');rows=[{id:'own',local_texto:'Centro',descricao:'Descrição',status:'pendente',atualizado_em:'2026-10-20'}];
 await act(async()=>{renderer=TestRenderer.create(React.createElement(OwnRecordsScreen,{kind:'relato'}));});assert.ok(text().includes('Seu relato · aguardando verificação'));assert.ok(text().includes('Ainda não foi publicado para a cidade'));await unmount();
 console.log('Product UI checks passed: stale/account/sign-out isolation, personal/city counters and cards, separate history routes, canonical notification inbox and explicit pending-report privacy. Native layout is not simulated.');
}finally{console.error=originalError;}
