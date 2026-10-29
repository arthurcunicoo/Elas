// Read-only validation against the configured live project. Credentials stay in the environment.
import {readFileSync} from 'node:fs';
import {createClient} from '@supabase/supabase-js';
const env=Object.fromEntries(readFileSync('.env','utf8').split(/\r?\n/).filter(l=>l.includes('=')).map(l=>{const i=l.indexOf('=');return [l.slice(0,i),l.slice(i+1).trim()];}));
const email=process.env.ELAS_TEST_EMAIL,password=process.env.ELAS_TEST_PASSWORD;
if(!email||!password)throw new Error('Defina ELAS_TEST_EMAIL e ELAS_TEST_PASSWORD localmente. Não grave senhas no projeto.');
const client=createClient(env.EXPO_PUBLIC_SUPABASE_URL,env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false},global:{fetch:(input,init)=>fetch(input,{...init,signal:init?.signal?AbortSignal.any([init.signal,AbortSignal.timeout(12000)]):AbortSignal.timeout(12000)})}});
const deadline=setTimeout(()=>{console.error('Prazo de 45s excedido na verificação HTTP. Nenhum fluxo de autenticação foi confirmado por este teste.');process.exit(2);},45000);
try{
 const auth=await client.auth.signInWithPassword({email,password});if(auth.error)throw auth.error;
 const checks={login:true};
 const calls=[['schema',()=>client.rpc('versao_app')],['perfil',()=>client.from('perfis').select('nome').eq('id',auth.data.user.id).single()],['papel',()=>client.rpc('meu_papel')],['busca',()=>client.rpc('pagina_app',{p_lista:'lugares',p_cursor:null,p_filtros:{busca:'Praça',categoria:'all',tags:[],conhecidas:[]}})],['favoritos',()=>client.from('favoritos').select('lugar_id').limit(21)],['relatos',()=>client.rpc('pagina_app',{p_lista:'registros_relato',p_cursor:null,p_filtros:{}})],['melhorias',()=>client.rpc('pagina_app',{p_lista:'registros_melhoria',p_cursor:null,p_filtros:{}})],['eventos',()=>client.rpc('pagina_app',{p_lista:'eventos',p_cursor:null,p_filtros:{passados:false}})],['enquetes',()=>client.rpc('pagina_app',{p_lista:'enquetes',p_cursor:null,p_filtros:{}})],['conquistas',()=>client.rpc('minha_participacao')],['notificacoes',()=>client.from('notificacoes').select('id').limit(21)],['admin',()=>client.rpc('admin_resumo')],['cadastros_admin',()=>client.rpc('fila_moderacao',{p_tipo:'perfil',p_filtros:{busca:'',status:''},p_cursor:null})]];
 for(const [name,call] of calls){const result=await call();if(result.error){if(['admin','cadastros_admin'].includes(name)&&result.error.code==='42501'){checks[name]={accessDeniedAsExpected:true};continue;}throw new Error(`${name}: ${result.error.code}`);}if(name==='schema'&&(!Number.isInteger(result.data)||result.data<11))throw Error('Schema incompatível: exige versão 11 ou superior');checks[name]=name==='papel'||name==='schema'?result.data:Array.isArray(result.data)?{ok:true,rows:result.data.length}:{ok:true};}
 console.log(JSON.stringify({checkedAt:new Date().toISOString(),mode:'live-read-only',checks},null,2));
}catch(error){
 console.error(JSON.stringify({checkedAt:new Date().toISOString(),mode:'live-read-only',passed:false,reason:error?.name==='AuthRetryableFetchError'?'Falha de rede/timeout. O fluxo Auth não foi confirmado.':error?.code??error?.message??'Falha na verificação'}));
 process.exitCode=1;
}finally{try{await client.auth.signOut({scope:'local'});}finally{clearTimeout(deadline);}}
