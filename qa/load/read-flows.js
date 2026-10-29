import http from 'k6/http';
import {check,sleep} from 'k6';
const origin=__ENV.QA_SUPABASE_URL??'',local=__ENV.QA_LOCAL_FIXTURE==='1'&&/^http:\/\/127\.0\.0\.1:\d+$/.test(origin);
if(!local&&(!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(origin)||origin.includes('pxcbzjxgxdmdayqwpqcj')))throw Error('Teste de carga exige staging separado; produção bloqueada.');
if(!local&&__ENV.QA_ALLOW_LOAD!=='staging-only')throw Error('Defina QA_ALLOW_LOAD=staging-only após revisar o alvo.');
const sessions=JSON.parse(open(__ENV.QA_TOKENS_FILE));
if(!Array.isArray(sessions)||!sessions.length||sessions.some(s=>typeof s.access_token!=='string'||typeof s.user_id!=='string'||!Number.isFinite(s.expires_at)||s.expires_at*1000<Date.now()+20*60000))throw Error('Forneça sessões QA válidas com pelo menos vinte minutos restantes.');
if(new Set(sessions.map(s=>s.user_id)).size!==sessions.length||new Set(sessions.map(s=>s.access_token)).size!==sessions.length)throw Error('As sessões devem pertencer a contas QA distintas.');
const scale=__ENV.QA_LOAD_PROFILE==='scale',max=scale?500:5;
if(sessions.length<max)throw Error(`São necessárias ${max} contas QA distintas para não simular todos os usuários com a mesma sessão.`);
export const options={
 scenarios:{readers:{executor:'ramping-vus',startVUs:0,stages:scale?[{duration:'1m',target:10},{duration:'1m',target:50},{duration:'1m',target:100},{duration:'1m',target:250},{duration:'1m',target:500},{duration:'2m',target:500},{duration:'1m',target:0}]:[{duration:'5s',target:5},{duration:'20s',target:5},{duration:'5s',target:0}],gracefulRampDown:'10s'}},
 thresholds:{http_req_failed:[{threshold:'rate<0.02',abortOnFail:true,delayAbortEval:'10s'}],http_req_duration:['p(95)<1500'],checks:['rate>0.99'],...Object.fromEntries(['busca','mapa','resumos','relatos','eventos','impactos','edge'].map(operation=>[`http_req_duration{operation:${operation}}`,['p(95)<1500']]))},
};
const bounds={p_sul:-28.70,p_oeste:-49.40,p_norte:-28.66,p_leste:-49.34};
const headers=token=>({apikey:__ENV.QA_PUBLISHABLE_KEY,Authorization:`Bearer ${token}`,'Content-Type':'application/json'});
export function setup(){const r=http.post(`${origin}/rest/v1/rpc/mapa_lugares`,JSON.stringify({...bounds,p_categoria:'all'}),{headers:headers(sessions[0].access_token),tags:{operation:'setup'}});if(r.status!==200)throw Error('Catálogo QA indisponível.');const places=r.json().places;if(!Array.isArray(places)||!places.length)throw Error('Carregue lugares reais/fixtures no staging antes de medir resumos.');return {ids:places.map(p=>p.id).slice(0,500)};}
export default function(data){const operation=['busca','mapa','resumos','relatos','eventos','impactos','edge'][(__VU+__ITER)%7];let endpoint,body;
 switch(operation){
 case 'busca':endpoint='/rest/v1/rpc/pagina_app';body={p_lista:'lugares',p_cursor:null,p_filtros:{busca:['Praça','Nereu','Centro','Congresso'][__ITER%4],categoria:'all',tags:[],conhecidas:[]}};break;
 case 'mapa':endpoint='/rest/v1/rpc/mapa_lugares';body={...bounds,p_categoria:'all'};break;
 case 'resumos':endpoint='/rest/v1/rpc/resumos_avaliacoes';body={p_lugares:data.ids,p_compacto:true};break;
 case 'relatos':endpoint='/rest/v1/rpc/mapa_relatos';body={...bounds,p_zoom:15};break;
 case 'eventos':endpoint='/rest/v1/rpc/pagina_app';body={p_lista:'eventos',p_cursor:null,p_filtros:{passados:false}};break;
 case 'impactos':endpoint='/rest/v1/rpc/painel_impactos';body={};break;
 case 'edge':endpoint='/functions/v1/lugares-osm';body={bounds:{south:bounds.p_sul,west:bounds.p_oeste,north:bounds.p_norte,east:bounds.p_leste},category:'all'};break;
 }
 const response=http.post(origin+endpoint,JSON.stringify(body),{headers:headers(sessions[(__VU-1)%sessions.length].access_token),tags:{operation},timeout:'20s'});
 let value;try{value=response.json();}catch{value=null;}
 check(response,{'HTTP 200':r=>r.status===200,'contrato esperado':()=>value&&typeof value==='object'&&(operation==='resumos'?Array.isArray(value.resumos):operation==='eventos'||operation==='busca'?Array.isArray(value.rows):operation==='mapa'||operation==='edge'?Array.isArray(value.places):operation==='relatos'?Array.isArray(value.nodes):!!value.minhas&&!!value.cidade)},{operation});
 sleep(1+Math.random());
}
