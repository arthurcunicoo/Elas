import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {PNG} from 'pngjs';
import pixelmatch from 'pixelmatch';
import {safeName} from './environment.mjs';
export function compareImages(baseline,current,{masks=[],maxChangedRatio=.0001}={}) {
 if(!Number.isFinite(maxChangedRatio)||maxChangedRatio<0||maxChangedRatio>.02)throw Error("Limite de diferença inválido (0–2%).");
 const a=PNG.sync.read(baseline),b=PNG.sync.read(current);
 if(a.width!==b.width||a.height!==b.height)throw Error('Dimensões diferentes: a baseline deve ser do mesmo aparelho e escala.');
 let masked=0;const excluded=new Set();
 for(const box of masks){if(![box.x,box.y,box.width,box.height].every(Number.isInteger)||box.x<0||box.y<0||box.width<1||box.height<1||box.x+box.width>a.width||box.y+box.height>a.height)throw Error('Máscara fora dos limites.');for(let y=box.y;y<box.y+box.height;y++)for(let x=box.x;x<box.x+box.width;x++)excluded.add(y*a.width+x);}
 masked=excluded.size;if(masked>a.width*a.height*.5)throw Error('Máscaras não podem esconder mais da metade da tela.');
 for(const pixel of excluded)for(let c=0;c<4;c++){a.data[pixel*4+c]=b.data[pixel*4+c]=c===3?255:0;}
 const diff=new PNG({width:a.width,height:a.height}),changed=pixelmatch(a.data,b.data,diff.data,a.width,a.height,{threshold:.1}),ratio=changed/(a.width*a.height-masked);
 return {passed:ratio<=maxChangedRatio,changed,ratio,diff:PNG.sync.write(diff)};
}
export function compareRun(runDir,deviceKey,fontScale) {
 safeName(deviceKey);if(!['1','1.3','1.6'].includes(String(fontScale)))throw Error('Escala inválida.');
 const baseline=path.resolve(`qa/visual/baselines/${deviceKey}/${fontScale}`),manifestFile=path.join(baseline,'manifest.json');
 if(!fs.existsSync(manifestFile))throw Error('Baseline real ainda não aprovada para este aparelho/escala.');
 const manifest=JSON.parse(fs.readFileSync(manifestFile,'utf8'));
 if(!manifest.appVersion||!manifest.build||!manifest.os)throw Error('Baseline sem identificação de build/OS.');
 if(!manifest.approvedBy||!manifest.approvedAt||!Array.isArray(manifest.screens)||!manifest.screens.length)throw Error('Baseline sem aprovação ou telas.');
 const run=JSON.parse(fs.readFileSync(path.join(runDir,'run.json'),'utf8'));if(run.status!=='passed'||run.deviceKey!==deviceKey||Number(run.fontScale)!==Number(fontScale))throw Error('A execução não passou ou não corresponde à baseline.');
 if(!run.appVersion||!run.build||[run.appVersion,run.build,run.os].some(value=>typeof value!=='string'||!value.trim()||value==='unknown')||run.os!==manifest.os)throw Error('Build/OS da execução ausente ou diferente da baseline.');
 const results=[];for(const screen of manifest.screens){safeName(screen.name);const result=compareImages(fs.readFileSync(path.join(baseline,screen.name+'.png')),fs.readFileSync(path.join(runDir,'screenshots',screen.name+'.png')),screen);fs.writeFileSync(path.join(runDir,screen.name+'-diff.png'),result.diff);results.push({name:screen.name,passed:result.passed,ratio:result.ratio});}
 fs.writeFileSync(path.join(runDir,'visual.json'),JSON.stringify({passed:results.every(r=>r.passed),results},null,2));if(results.some(r=>!r.passed))throw Error('Regressão visual encontrada; examine os diffs.');return results;
}
if(process.argv[1]===fileURLToPath(import.meta.url)){try{console.log(JSON.stringify(compareRun(...process.argv.slice(2))));}catch(error){console.error(error.message);process.exitCode=1;}}
