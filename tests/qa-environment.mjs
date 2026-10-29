import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {binaryAvailable,environmentReport} from '../scripts/qa/doctor.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'elas-doctor-'));
try {
 const marker=path.join(root,'executed');
 fs.writeFileSync(path.join(root,'supabase'),`#!/bin/sh\ntouch '${marker}'\n`,{mode:0o755});
 assert.equal(binaryAvailable('supabase',{PATH:root},'linux'),true);
 assert.equal(fs.existsSync(marker),false,'tool inventory must never launch the CLI');
 fs.writeFileSync(path.join(root,'unexecutable'),'fixture',{mode:0o644});
 assert.equal(binaryAvailable('unexecutable',{PATH:root},'linux'),false);
 fs.mkdirSync(path.join(root,'directory'));assert.equal(binaryAvailable('directory',{PATH:root},'linux'),false);
 assert.equal(binaryAvailable('missing',{PATH:root},'linux'),false);
 fs.writeFileSync(path.join(root,'maestro.CMD'),'fixture');
 assert.equal(binaryAvailable('maestro',{Path:root,PATHEXT:'.EXE;.CMD'},'win32'),true);
 const report=environmentReport({PATH:root,QA_PASSWORD:'must-not-leak',QA_EMAIL:'private@fixture.invalid'});
 assert.equal(report.configured.qaAccount,true);assert.ok(!JSON.stringify(report).includes('must-not-leak'));assert.equal(fs.existsSync(marker),false);
 console.log('QA environment checks passed: executable/file/PATH detection, Windows PATHEXT, no CLI execution or telemetry side effect, and credentials reduced to configuration booleans.');
} finally {fs.rmSync(root,{recursive:true,force:true});}
