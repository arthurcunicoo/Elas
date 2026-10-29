import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {productionRef} from '../qa/environment.mjs';
const hash=async file=>{const value=createHash('sha256');for await(const chunk of fs.createReadStream(file))value.update(chunk);return value.digest('hex');};
function list(directory,prefix=''){return fs.readdirSync(directory,{withFileTypes:true}).flatMap(entry=>{const rel=path.join(prefix,entry.name),full=path.join(directory,entry.name);if(entry.isSymbolicLink())throw Error('Backup não aceita links simbólicos.');return entry.isDirectory()?list(full,rel):[rel];});}
export async function sealBackup(directory,schemaVersion=null) {
 if(schemaVersion!==null&&(!Number.isInteger(schemaVersion)||schemaVersion<1))throw Error('Versão de schema inválida.');
 const required=['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql','managed-customizations.sql','project-config.json'];for(const file of required)if(!fs.existsSync(path.join(directory,file))||!fs.statSync(path.join(directory,file)).size)throw Error(`Backup incompleto: ${file}`);
 if(!fs.existsSync(path.join(directory,'storage')))throw Error('Falta o diretório storage, mesmo quando vazio.');
 const entries=[];for(const rel of list(directory).filter(name=>name!=='manifest.json'))entries.push({path:rel.replaceAll(path.sep,'/'),bytes:fs.statSync(path.join(directory,rel)).size,sha256:await hash(path.join(directory,rel))});
 const manifest={format:'elas-supabase-backup-v1',createdAt:new Date().toISOString(),schemaVersion,storageIncluded:true,files:entries};fs.writeFileSync(path.join(directory,'manifest.json'),JSON.stringify(manifest,null,2),{mode:0o600});return manifest;
}
export async function verifyBackup(directory) {
 const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.json'),'utf8'));
 if(manifest.format!=='elas-supabase-backup-v1'||manifest.storageIncluded!==true||!Array.isArray(manifest.files))throw Error('Manifesto inválido.');
 for(const required of ['roles.sql','schema.sql','data.sql','history_schema.sql','history_data.sql','managed-customizations.sql','project-config.json'])if(!manifest.files.some(f=>f.path===required))throw Error('Backup incompleto.');
 const unique=new Set();for(const entry of manifest.files){if(typeof entry.path!=='string'||entry.path.includes('..')||path.isAbsolute(entry.path)||unique.has(entry.path))throw Error('Caminho de backup inválido.');unique.add(entry.path);const file=path.join(directory,entry.path);if(!fs.existsSync(file)||fs.lstatSync(file).isSymbolicLink()||fs.statSync(file).size!==entry.bytes||await hash(file)!==entry.sha256)throw Error(`Integridade falhou: ${entry.path}`);}
 return manifest;
}
const exec=(binary,args)=>{const result=spawnSync(binary,args,{encoding:'utf8',timeout:900000,env:{...process.env,SUPABASE_TELEMETRY_DISABLED:'1',DO_NOT_TRACK:'1'}});if(result.error||result.status!==0)throw Error(`${binary} falhou; consulte o ambiente local. Credenciais e logs SQL não são impressos por este script.`);return result.stdout;};
export async function backup(directory,env=process.env) {
 process.umask(0o077);if(!env.BACKUP_DB_URL||!env.BACKUP_STORAGE_DIR||!env.BACKUP_CONFIG_FILE)throw Error('Configure BACKUP_DB_URL, BACKUP_STORAGE_DIR e BACKUP_CONFIG_FILE.');
 const output=path.resolve(directory);if(output.startsWith(process.cwd()+path.sep)||output===process.cwd())throw Error('Salve o backup fora do repositório e em armazenamento protegido.');
 fs.mkdirSync(output,{recursive:false,mode:0o700});
 const schemaVersion=Number(exec('psql',['--tuples-only','--no-align','--dbname',env.BACKUP_DB_URL,'--command','select public.versao_app()']));
 if(!Number.isInteger(schemaVersion)||schemaVersion<1)throw Error('Não foi possível verificar a versão do backup.');
 const base=['db','dump','--db-url',env.BACKUP_DB_URL];
 exec('supabase',[...base,'--role-only','--file',path.join(output,'roles.sql')]);
 exec('supabase',[...base,'--file',path.join(output,'schema.sql')]);
 exec('supabase',[...base,'--data-only','--use-copy','--file',path.join(output,'data.sql')]);
 exec('supabase',[...base,'--schema','supabase_migrations','--file',path.join(output,'history_schema.sql')]);
 exec('supabase',[...base,'--schema','supabase_migrations','--data-only','--use-copy','--file',path.join(output,'history_data.sql')]);
 fs.copyFileSync('supabase/RESTORE-CUSTOMIZACOES.sql',path.join(output,'managed-customizations.sql'));
 fs.cpSync(env.BACKUP_STORAGE_DIR,path.join(output,'storage'),{recursive:true,dereference:false});fs.copyFileSync(env.BACKUP_CONFIG_FILE,path.join(output,'project-config.json'));return sealBackup(output,schemaVersion);
}
export async function restore(directory,env=process.env) {
 if(env.RESTORE_CONFIRM!=='disposable-staging'||!env.RESTORE_DB_URL||!env.RESTORE_PROJECT_REF)throw Error('Confirme um destino descartável de staging e configure RESTORE_DB_URL/RESTORE_PROJECT_REF.');
 if(env.RESTORE_PROJECT_REF===productionRef||decodeURIComponent(env.RESTORE_DB_URL).includes(productionRef))throw Error('Restauração automática no projeto real é bloqueada.');
 const target=new URL(env.RESTORE_DB_URL),ref=env.RESTORE_PROJECT_REF;
 if(!/^[a-z0-9]{20}$/.test(ref)||!(target.hostname===`db.${ref}.supabase.co`||(target.hostname.endsWith('.pooler.supabase.com')&&decodeURIComponent(target.username)===`postgres.${ref}`)))throw Error('O host/usuário da conexão não corresponde ao projeto de staging declarado.');
 const manifest=await verifyBackup(directory);
 if(!Number.isInteger(manifest.schemaVersion)||manifest.schemaVersion<1)throw Error('Backup sem versão comprovada; restauração bloqueada.');
 // Database only. Storage bytes/configuration require separate transfer and validation.
 exec('psql',['--single-transaction','--set','ON_ERROR_STOP=1','--dbname',env.RESTORE_DB_URL,'--file',path.join(directory,'roles.sql'),'--file',path.join(directory,'schema.sql'),'--command','SET session_replication_role = replica','--file',path.join(directory,'data.sql'),'--command','SET session_replication_role = origin','--file',path.join(directory,'history_schema.sql'),'--file',path.join(directory,'history_data.sql'),'--file',path.join(directory,'managed-customizations.sql'),'--command',"DO $$ BEGIN IF to_regclass('cron.job') IS NOT NULL THEN EXECUTE 'UPDATE cron.job SET active=false'; END IF; END $$;"]);
}
if(process.argv[1]===fileURLToPath(import.meta.url)){const[action,directory]=process.argv.slice(2);try{if(!directory)throw Error('Informe um diretório.');if(action==='backup')await backup(directory);else if(action==='verify')await verifyBackup(directory);else if(action==='restore')await restore(directory);else throw Error('Use backup, verify ou restore.');console.log(action==='restore'?'Banco restaurado em staging; Storage/configuração e fluxos ainda precisam ser validados.':'Operação concluída.');}catch(error){console.error(error.message);process.exitCode=1;}}
