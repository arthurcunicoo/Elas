import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

// Availability checks must not launch CLIs, authenticate, or emit their telemetry.
export function binaryAvailable(binary, env=process.env, platform=process.platform) {
 const windows=platform==='win32';
 const dirs=(env.PATH??env.Path??'').split(windows?';':path.delimiter).filter(Boolean);
 const suffixes=windows?['',...(env.PATHEXT??'.EXE;.CMD;.BAT;.COM').split(';')]:[''];
 return dirs.some(dir=>suffixes.some(suffix=>{
  try{const file=path.join(dir.replace(/^"|"$/g,''),binary+suffix);if(!fs.statSync(file).isFile())return false;fs.accessSync(file,windows?fs.constants.F_OK:fs.constants.X_OK);return true;}catch{return false;}
 }));
}
export function environmentReport(env=process.env) {
 return {node:process.versions.node,platform:process.platform,tools:Object.fromEntries(['adb','maestro','k6','psql','supabase','xcrun'].map(name=>[name,binaryAvailable(name,env)])),configured:{staging:!!env.QA_SUPABASE_URL,qaAccount:!!env.QA_EMAIL&&!!env.QA_PASSWORD,sentry:!!env.EXPO_PUBLIC_SENTRY_DSN,eas:!!env.EAS_PROJECT_ID}};
}
if(process.argv[1]===fileURLToPath(import.meta.url)) {
 const report=environmentReport();console.log(JSON.stringify(report,null,2));
 if(!report.tools.adb&&!report.tools.xcrun)process.exitCode=1;
}
