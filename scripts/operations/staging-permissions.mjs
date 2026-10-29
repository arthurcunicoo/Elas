// Real Supabase sessions only. Never substitute local fixtures for this evidence.
import assert from 'node:assert/strict';
import {createClient} from '@supabase/supabase-js';
import {writeFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {requireStaging} from '../qa/environment.mjs';
export function stagingConfiguration(env) {
  const required=['QA_SUPABASE_URL','QA_PUBLISHABLE_KEY','QA_EMAIL_A','QA_PASSWORD_A','QA_EMAIL_B','QA_PASSWORD_B','QA_EMAIL_ADMIN','QA_PASSWORD_ADMIN'];
  if(required.some(name=>!env[name]))throw Error('Configure URL/chave publicável e três contas dedicadas de staging (A, B e ADMIN).');
  const url=requireStaging({...env,QA_EMAIL:env.QA_EMAIL_A,QA_PASSWORD:env.QA_PASSWORD_A});
  if(new Set([env.QA_EMAIL_A.toLowerCase(),env.QA_EMAIL_B.toLowerCase(),env.QA_EMAIL_ADMIN.toLowerCase()]).size!==3)throw Error('Use três contas QA distintas.');
  return url;
}
export async function validateStagingPermissions(env=process.env,clientFactory=createClient) {
  const url=stagingConfiguration(env),clients=[];let restored=true,unexpectedPromotion;
  const client=()=>{const value=clientFactory(url.origin,env.QA_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});clients.push(value);return value;};
  const anon=client(),a=client(),b=client(),admin=client();
  const login=async(db,suffix)=>{const value=await db.auth.signInWithPassword({email:env['QA_EMAIL_'+suffix],password:env['QA_PASSWORD_'+suffix]});if(value.error||!value.data.user)throw Error('Não foi possível entrar em uma conta QA.');return value.data.user.id;};
  const checks=[];
  try {
    const ids=await Promise.all([login(a,'A'),login(b,'B'),login(admin,'ADMIN')]);assert.equal(new Set(ids).size,3);
    for(const db of [a,b]){const role=await db.rpc('meu_papel');assert.equal(role.error,null);assert.equal(role.data,'usuario');}
    assert.equal((await admin.rpc('meu_papel')).data,'admin');
    assert.ok((await anon.rpc('admin_resumo')).error);checks.push('anonymous_admin_denied');
    for(const [db,owner,other] of [[a,ids[0],ids[1]],[b,ids[1],ids[0]]]) {
      const profile=await db.from('perfis').select('id,nome').eq('id',other);assert.equal(profile.error,null);assert.equal(profile.data.length,0);
      assert.ok((await db.rpc('admin_resumo')).error);assert.ok((await db.rpc('pagina_papeis',{p_busca:'',p_cursor:null,p_historico:false})).error);
      const promote=await db.rpc('alterar_papel',{p_usuario:owner,p_papel:'admin',p_anterior:'usuario',p_motivo:'Verificação QA de bloqueio de autopromoção'});
      if(!promote.error){unexpectedPromotion=owner;throw Error('Falha de autorização: autopromoção foi aceita.');}
    }
    checks.push('two_way_profile_isolation','ordinary_admin_reads_denied','self_promotion_denied');
    const summary=await admin.rpc('admin_resumo');assert.equal(summary.error,null);assert.ok(summary.data&&typeof summary.data==='object');
    const caps=await admin.rpc('capacidades_backend');assert.equal(caps.error,null);assert.ok(caps.data.version>=12&&caps.data.adminRoles&&caps.data.atomicCatalog);
    checks.push('administrator_summary_available','backend_capabilities_available');
    const report={status:'passed',executedAt:new Date().toISOString(),backendHost:url.hostname,accounts:3,checks,
      limitations:['Does not validate mailbox delivery/deep links, physical push, load or remote restore.']};
    if(env.QA_EVIDENCE_FILE){await mkdir(path.dirname(env.QA_EVIDENCE_FILE),{recursive:true});await writeFile(env.QA_EVIDENCE_FILE,JSON.stringify(report,null,2)+'\n');}
    return report;
  } finally {
    if(unexpectedPromotion){const cleanup=await admin.rpc('alterar_papel',{p_usuario:unexpectedPromotion,p_papel:'usuario',p_anterior:'admin',p_motivo:'Reversão de autopromoção indevida detectada em QA'});restored=!cleanup.error;}
    await Promise.allSettled(clients.map(db=>db.auth.signOut({scope:'local'})));
    if(!restored)throw Error('Falha de autorização com limpeza pendente no staging. Revise a conta QA antes de continuar.');
  }
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 try{const report=await validateStagingPermissions();console.log(JSON.stringify(report,null,2));}
 catch{console.error('Validação real de staging não concluída. Confira configuração e contas dedicadas; nenhum resultado aprovado foi gerado.');process.exitCode=2;}
}
