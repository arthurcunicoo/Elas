import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {productionRef} from './environment.mjs';
export const releaseRequirements=["android-small", "android-mid", "iphone-notch", "font-130", "font-160", "keyboard", "location-denied", "gps-disabled", "network-slow", "network-drop", "background-return", "persisted-login", "recovery-email-login", "avatar-upload", "many-pins", "visual-baselines", "crash-received", "edge-observability", "load-staging", "android-production", "ios-production", "backup-restore"];
export function evidenceIssues(report,root=process.cwd()) {
 const issues=[],version=JSON.parse(fs.readFileSync(path.join(root,'app.json'),'utf8')).expo.version;
 if(report?.version!==1||report.appVersion!==version||!Array.isArray(report.requirements))return ['Relatório de evidências inválido ou de outra versão do app.'];
 if(new Set(report.requirements.map(row=>row.id)).size!==report.requirements.length)issues.push('Requisitos duplicados no relatório de evidências.');
 for(const id of releaseRequirements) {
  const item=report.requirements.find(row=>row.id===id);
  if(item?.status!=='passed'||typeof item.artifact!=='string'||typeof item.executedAt!=='string'||typeof item.reviewer!=='string'||!item.reviewer.trim()) {issues.push(`Validação pendente: ${id}`);continue;}
  const executed=Date.parse(item.executedAt);
  if(!Number.isFinite(executed)||executed>Date.now()+60000)issues.push(`Data de evidência inválida: ${id}`);
  const base=path.resolve(root,'qa/evidence'),file=path.resolve(root,item.artifact);
  try {
   if(!file.startsWith(base+path.sep)||!fs.lstatSync(file).isFile()||!fs.statSync(file).size||!fs.realpathSync(file).startsWith(fs.realpathSync(base)+path.sep))throw Error('invalid artifact');
  }catch{issues.push(`Evidência ausente ou inválida: ${id}`);}
 }
 return issues;
}
export function releaseIssues(env=process.env,{platform='android',evidence=false}={}) {
 const issues=[],need=name=>{if(!env[name])issues.push(`Ausente: ${name}`);};
 for(const name of ['EXPO_PUBLIC_SUPABASE_URL','EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY','EXPO_PUBLIC_SENTRY_DSN','SENTRY_ORG','SENTRY_PROJECT','SENTRY_AUTH_TOKEN','EAS_PROJECT_ID'])need(name);
 if(env.EXPO_PUBLIC_DEMO==='1'||env.EXPO_PUBLIC_SHOWCASE==='1'||env.EXPO_PUBLIC_QA_DIAGNOSTICS==='1')issues.push('Release não pode habilitar dados de demonstração.');
 if(env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY&&!env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.startsWith('sb_publishable_'))issues.push('Use somente chave publicável no aplicativo.');
 if(env.EXPO_PUBLIC_APP_ENV!=='production')issues.push('EXPO_PUBLIC_APP_ENV deve ser production.');
 if(env.APP_VARIANT==='qa')issues.push('APP_VARIANT não pode ser qa no release.');
 if(env.EXPO_PUBLIC_SUPABASE_URL&&!/^https:\/\/[a-z0-9]+\.supabase\.co\/?$/.test(env.EXPO_PUBLIC_SUPABASE_URL))issues.push('URL Supabase inválida.');
 if(env.EXPO_PUBLIC_SENTRY_DSN&&!/^https:\/\/[^@\s]+@[^/\s]+\/\d+$/.test(env.EXPO_PUBLIC_SENTRY_DSN))issues.push('DSN Sentry inválido.');
 if(platform==='android')need('GOOGLE_MAPS_ANDROID_API_KEY');
 if(platform==='web'&&(!env.EXPO_PUBLIC_MAP_TILE_URL||env.EXPO_PUBLIC_MAP_TILE_MODE==='pilot'))issues.push('Web de produção exige provedor de tiles configurado.');
 if(evidence){
  if(!fs.existsSync('qa/release-evidence.json'))issues.push('Evidências de release ainda não registradas.');
  else {try{issues.push(...evidenceIssues(JSON.parse(fs.readFileSync('qa/release-evidence.json','utf8'))));}catch{issues.push('Relatório de evidências inválido.');}}
 }
 return issues;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const issues=releaseIssues(process.env,{platform:process.argv[2]??'android',evidence:process.argv.includes('--evidence')});console.log(JSON.stringify({ready:!issues.length,productionRef,issues},null,2));if(issues.length)process.exitCode=1;}
