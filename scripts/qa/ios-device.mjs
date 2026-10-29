import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireStaging,safeName} from './environment.mjs';
import {verifyIosBuild} from './ios-diagnostics.mjs';
const staging=requireStaging();const key=safeName(process.env.QA_DEVICE_KEY),udid=process.env.APPIUM_UDID;
if(process.platform!=='darwin'||!udid)throw Error('Execute no Mac com o iPhone físico conectado e APPIUM_UDID configurado.');
const devices=spawnSync('xcrun',['xctrace','list','devices'],{encoding:'utf8',timeout:20000});
const deviceLine=devices.stdout?.split('\n').find(line=>line.includes(udid)&&!line.toLowerCase().includes('simulator'));
if(devices.status!==0||!deviceLine)throw Error('iPhone físico não localizado pelo Xcode.');
const server=new URL(process.env.APPIUM_SERVER??'http://127.0.0.1:4723');if(server.protocol!=='http:'||server.username||server.password||!['127.0.0.1','localhost'].includes(server.hostname))throw Error('Use Appium HTTP local para esta execução.');
const out=path.resolve(`qa/evidence/${key}-ios-${Date.now()}`);fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});let session;
const command=async(method,route,body)=>{const response=await fetch(new URL(route,server),{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(60000)});const value=(await response.json()).value;if(!response.ok||value?.error)throw Error('Comando Appium falhou; consulte o servidor local sem registrar credenciais.');return value;};
const pause=()=>new Promise(resolve=>setTimeout(resolve,1000));
async function element(id){for(let attempt=0;attempt<30;attempt++){try{const value=await command('POST',`/session/${session}/element`,{using:'accessibility id',value:id});return value['element-6066-11e4-a52e-4f735466cecf'];}catch{if(attempt===29)throw Error(`Elemento não localizado: ${id}`);await pause();}}}
const click=async id=>command('POST',`/session/${session}/element/${await element(id)}/click`,{});
const type=async(id,text)=>command('POST',`/session/${session}/element/${await element(id)}/value`,{text});
const capture=async name=>{const data=await command('GET',`/session/${session}/screenshot`);fs.writeFileSync(path.join(out,'screenshots',name+'.png'),Buffer.from(data,'base64'));};
const result={version:1,kind:'ios-device-e2e',deviceKey:key,physical:true,model:deviceLine.trim(),startedAt:new Date().toISOString(),status:'running'};
try {
 const value=await command('POST','/session',{capabilities:{alwaysMatch:{platformName:'iOS','appium:automationName':'XCUITest','appium:udid':udid,'appium:bundleId':'br.com.elasnacidade.app.qa','appium:noReset':true}}});session=value.sessionId;
 await click('Começar');await type('auth-email',process.env.QA_EMAIL);await type('auth-password',process.env.QA_PASSWORD);await click('auth-submit');await element('nav-map');
 Object.assign(result,await verifyIosBuild({command,element,session,expectedHost:staging.host,os:value.capabilities?.platformVersion??value.capabilities?.['appium:platformVersion']}));
 await capture('00-build-info');
 await command('POST',`/session/${session}/execute/sync`,{script:'mobile: deepLink',args:[{url:'elas-qa://mapa',bundleId:'br.com.elasnacidade.app.qa'}]});await element('nav-map');
 // Initial map loading popup is dismissible, even on a slow connection.
 try{const value=await command('POST',`/session/${session}/element`,{using:'accessibility id',value:'Continuar no app enquanto o mapa carrega'});await command('POST',`/session/${session}/element/${value['element-6066-11e4-a52e-4f735466cecf']}/click`,{});}catch{}
 await element('map-search');await capture('01-map');await click('nav-participate');await element('Avaliar um lugar');await element('Relatar uma situação');await capture('03-participation');result.status='passed';
} catch(error){result.status='failed';console.error(error.message);process.exitCode=1;}
finally{result.finishedAt=new Date().toISOString();fs.writeFileSync(path.join(out,'run.json'),JSON.stringify(result,null,2));if(session)await command('DELETE',`/session/${session}`).catch(()=>{});}
console.log(out);
