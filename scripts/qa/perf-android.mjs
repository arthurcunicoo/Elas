import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {requireStaging,safeName} from './environment.mjs';
requireStaging();const [serial,key]=process.argv.slice(2);safeName(key);if(!serial||serial.startsWith('emulator-'))throw Error('Informe um Android físico.');
const run=(binary,args)=>{const r=spawnSync(binary,args,{encoding:'utf8',timeout:600000,env:{...process.env,MAESTRO_CLI_NO_ANALYTICS:'1'}});if(r.error||r.status!==0)throw Error(`${binary} falhou.`);return r.stdout;};
const adb=(...args)=>run('adb',['-s',serial,...args]);if(adb('shell','getprop','ro.kernel.qemu').trim()==='1')throw Error('Emulador não mede RAM/FPS do aparelho alvo.');
const out=path.resolve(`qa/evidence/${key}-perf-${Date.now()}`);fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});const app='br.com.elasnacidade.app.qa';
adb('shell','dumpsys','gfxinfo',app,'reset');const memory=[];
for(let i=0;i<6;i++){
 const raw=adb('shell','dumpsys','meminfo',app);fs.writeFileSync(path.join(out,`memory-${i}.txt`),raw);const match=raw.match(/TOTAL PSS:\s*(\d+)/)??raw.match(/TOTAL\s+(\d+)/);memory.push({batch:i,pssKb:match?Number(match[1]):null,at:new Date().toISOString()});
 if(i<5)run('maestro',['--device',serial,'test','-e',`APP_ID=${app}`,'-e',`SCREENSHOT_DIR=${path.join(out,'screenshots')}`,'qa/maestro/flows/06-stress.yaml']);
}
fs.writeFileSync(path.join(out,'gfxinfo.txt'),adb('shell','dumpsys','gfxinfo',app,'framestats'));
fs.writeFileSync(path.join(out,'performance.json'),JSON.stringify({kind:'android-performance',status:'measured-needs-review',model:adb('shell','getprop','ro.product.model').trim(),fontScale:adb('shell','settings','get','system','font_scale').trim(),memory,note:'gfxinfo não mede sozinho todos os frames do mapa nativo. Revisar também freeze visível e Perfetto.'},null,2));console.log(out);
