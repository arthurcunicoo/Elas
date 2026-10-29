import fs from 'node:fs';
import path from 'node:path';
import {createClient} from '@supabase/supabase-js';
import {requireStaging} from './environment.mjs';
const [input,output]=process.argv.slice(2),accounts=JSON.parse(fs.readFileSync(input,'utf8'));
if(!Array.isArray(accounts)||!accounts.length||accounts.length>500)throw Error('Informe entre 1 e 500 contas QA.');
const first=accounts[0];requireStaging({...process.env,QA_EMAIL:first.email,QA_PASSWORD:first.password});
if(!process.env.QA_PUBLISHABLE_KEY?.startsWith('sb_publishable_'))throw Error('Use chave publicável do staging.');
if(!output||path.resolve(output).startsWith(process.cwd()+path.sep))throw Error('Salve sessões fora do repositório.');
const delay=Number(process.env.QA_AUTH_DELAY_MS??2100);if(!Number.isFinite(delay)||delay<100||delay>10000)throw Error("QA_AUTH_DELAY_MS deve ficar entre 100 e 10000 ms.");
const sessions=[];for(const account of accounts){
 if(sessions.length)await new Promise(resolve=>setTimeout(resolve,delay));const client=createClient(process.env.QA_SUPABASE_URL,process.env.QA_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});const {data,error}=await client.auth.signInWithPassword(account);if(error||!data.session||!data.user)throw Error('Login QA falhou. Confira credenciais e limites de autenticação; nenhum token é impresso.');sessions.push({user_id:data.user.id,access_token:data.session.access_token,expires_at:data.session.expires_at});client.auth.stopAutoRefresh();}
if(new Set(sessions.map(s=>s.user_id)).size!==sessions.length)throw Error('Contas repetidas.');fs.writeFileSync(output,JSON.stringify(sessions),{mode:0o600,flag:'wx'});console.log(`${sessions.length} sessões QA preparadas em arquivo privado. Execute a carga antes de expirarem.`);
