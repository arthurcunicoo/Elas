import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {requireStaging,safeName} from './environment.mjs';
export function runDevice({serial,deviceKey,fontScale=1,flow='critical',allowEmulator=false,outDir},env=process.env,run=spawnSync) {
 const staging=requireStaging(env);safeName(deviceKey);
 if(!serial||![1,1.3,1.6].includes(Number(fontScale)))throw Error('Informe serial e escala 1, 1.3 ou 1.6.');
 const flows={critical:'01-critical',session:'02-session',location:'03-location-denied',recoveryRequest:'04-recovery-request',recoveryComplete:'05-recovery-complete'};
 if(!flows[flow])throw Error('Fluxo desconhecido.');
 if(flow==='recoveryComplete'&&(!env.QA_OTP||!env.QA_NEW_PASSWORD))throw Error('Leia o código na caixa de teste e configure QA_OTP e QA_NEW_PASSWORD.');
 const exec=(binary,args,options={})=>{const result=run(binary,args,{encoding:'utf8',timeout:180000,...options});if(result.error||result.status!==0)throw Error(`${binary} falhou; confira a instalação e a conexão do aparelho.`);return result.stdout.trim();};
 const adb=(...args)=>exec('adb',['-s',serial,...args]);
 if(adb('get-state')!=='device')throw Error('Aparelho não autorizado/conectado.');
 const emulator=serial.startsWith('emulator-')||adb('shell','getprop','ro.kernel.qemu')==='1';
 if(emulator&&!allowEmulator)throw Error('Esta execução exige aparelho físico; use --allow-emulator apenas para CI.');
 const previous=adb('shell','settings','get','system','font_scale');
 const output=path.resolve(outDir??`qa/evidence/${deviceKey}-${String(fontScale).replace('.','_')}-${Date.now()}`);fs.mkdirSync(path.join(output,'screenshots'),{recursive:true});
 const packageInfo=adb('shell','dumpsys','package','br.com.elasnacidade.app.qa');
 const appVersion=packageInfo.match(/versionName=([^\s]+)/)?.[1]??'unknown',build=packageInfo.match(/versionCode=(\d+)/)?.[1]??'unknown';
 const metadata={appVersion,build,version:1,kind:'android-e2e',deviceKey,physical:!emulator,fontScale:Number(fontScale),flow,startedAt:new Date().toISOString(),status:'running',model:adb('shell','getprop','ro.product.model'),os:adb('shell','getprop','ro.build.version.release')};
 try {
  adb('shell','settings','put','system','font_scale',String(fontScale));
  const vars={QA_HOST:staging.host,APP_ID:'br.com.elasnacidade.app.qa',APP_SCHEME:'elas-qa',QA_EMAIL:env.QA_EMAIL,QA_PASSWORD:env.QA_PASSWORD,QA_OTP:env.QA_OTP??'',QA_NEW_PASSWORD:env.QA_NEW_PASSWORD??'',QA_PLACE_QUERY:env.QA_PLACE_QUERY??'Praça Nereu Ramos',SCREENSHOT_DIR:path.join(output,'screenshots')};
  exec('maestro',['--device',serial,'test','--format','junit','--output',path.join(output,'junit.xml'),...Object.entries(vars).flatMap(([key,value])=>['-e',`${key}=${value}`]),`qa/maestro/flows/${flows[flow]}.yaml`],{timeout:600000,stdio:['ignore','pipe','pipe'],env:{...env,MAESTRO_CLI_NO_ANALYTICS:'1'}});
  metadata.status='passed';
 } catch(error) {metadata.status='failed';throw error;}
 finally {metadata.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(output,'run.json'),JSON.stringify(metadata,null,2));if(previous==='null')adb('shell','settings','delete','system','font_scale');else adb('shell','settings','put','system','font_scale',previous);}
 return output;
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const [serial,deviceKey,fontScale='1',flow='critical']=process.argv.slice(2).filter(v=>v!=='--allow-emulator');
 try{console.log(runDevice({serial,deviceKey,fontScale:Number(fontScale),flow,allowEmulator:process.argv.includes('--allow-emulator')}));}catch(error){console.error(error.message);process.exitCode=1;}
}
