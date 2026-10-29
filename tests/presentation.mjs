import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import {demonstrationPolls,demonstrateVote,demonstrationResult,demonstrationReports,demonstrationImpactCounts} from '../features/presentation/content.ts';
const row=(tipo,dados={},inicia_em='2099-01-01T12:00:00Z')=>({id:'demo:'+tipo+':1',tipo,dados,inicia_em,titulo:'Exemplo',descricao:'Exemplo fictício',lugar_id:'nereu',local_texto:'Praça',criado_em:'2026-10-27T12:00:00Z'});
const options=[{id:'demo:option:1',texto:'A',ordem:0,votos:15},{id:'demo:option:2',texto:'B',ordem:1,votos:10}];
const open=demonstrationPolls([row('enquete',{opcoes:options})],false)[0];
assert.equal(open.resultados_visiveis,false);assert.ok(open.opcoes.every(option=>option.votos===null));
assert.equal(demonstrateVote(open,'demo:option:2').resultados_visiveis,true);
assert.equal(demonstrateVote(open,'demo:option:2').minha_opcao,'demo:option:2');
assert.deepEqual(demonstrationResult(open,row('enquete',{opcoes:options}),'demo:option:2').opcoes.map(value=>value.votos),[15,11]);
assert.ok(open.opcoes.every(value=>value.votos===null),'simulation cannot mutate a loaded poll');
assert.throws(()=>demonstrateVote({...open,demonstracao:false},'demo:option:1'));
const closed=demonstrationPolls([row('enquete',{opcoes:options},'2000-01-01T12:00:00Z')],true)[0];
assert.equal(closed.resultados_visiveis,true);assert.equal(closed.opcoes[0].votos,15);assert.throws(()=>demonstrateVote(closed,'demo:option:1'));
assert.deepEqual(demonstrationPolls([row('enquete',{opcoes:[{id:'real',texto:'No',votos:1}]})],false),[]);
assert.deepEqual(demonstrationPolls([row('enquete',{},'invalid')],false),[]);
const reports=demonstrationReports([row('relato',{categoria:'Iluminação'})]);assert.equal(reports[0].demonstracao,true);assert.equal(reports[0].status,'pendente');
assert.deepEqual(demonstrationImpactCounts([{estado:'solicitada'},{estado:'concluida'},{estado:'em_andamento'},{estado:'unknown'}]),{solicitada:1,em_andamento:1,concluida:1});
const source=ts.transpileModule(fs.readFileSync('lib/appMode.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
for(const [dev,env,expected] of [[false,{EXPO_PUBLIC_SHOWCASE:'1',EXPO_PUBLIC_APP_ENV:'production'},false],[false,{EXPO_PUBLIC_SHOWCASE:'1',EXPO_PUBLIC_APP_ENV:'presentation'},true],[true,{EXPO_PUBLIC_SHOWCASE:'1'},true],[true,{EXPO_PUBLIC_SHOWCASE:'0'},false]]){
 const module={exports:{}};new Function('exports','module','process','__DEV__',source)(module.exports,module,{env},dev);assert.equal(module.exports.showcaseEnabled,expected);
}
const code=ts.transpileModule(fs.readFileSync('features/community/community.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
let calls=0;const module={exports:{}};
new Function('require','exports','module',code)(name=>name.includes('supabase')?{requireBackend:()=>({rpc:async()=>{calls++;return{error:null};}})}:{},module.exports,module);
await assert.rejects(module.exports.vote('demo:enquete:1','demo:option:1'),/demonstração/);assert.equal(calls,0);
console.log('Presentation checks passed: production opt-out, explicit presentation mode, hidden poll examples until vote/end, local-only simulated votes, immutable real totals and clearly fictional pending reports.');
