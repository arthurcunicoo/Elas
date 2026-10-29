import assert from 'node:assert/strict';
import {browserFixture} from '../scripts/qa/browser-fixture.mjs';
const fixture=await browserFixture();
try {
 const html=await fetch(fixture.url);assert.equal(html.status,200);assert.ok((await html.text()).includes('protectedStorage.js'));
 for(const file of ['protectedStore.js','protectedStorage.js','webStorageLock.js','publicOffline.js','raw.js']){
  const response=await fetch(fixture.url+'/'+file);assert.equal(response.status,200,file);
  assert.ok(response.headers.get('content-type').includes('text/javascript'));
  const source=await response.text();assert.ok(source.length>50);assert.ok(!source.includes('@react-native-async-storage/async-storage'));
 }
 const adapter=await (await fetch(fixture.url+'/protectedStorage.js')).text();
 assert.ok(adapter.includes('./webStorageLock.js'));assert.ok(adapter.includes('./protectedStore.js'));
 assert.equal((await fetch(fixture.url+'/package.json')).status,404,'fixture must not expose project files');
 console.log('Browser fixture HTTP checks passed: real production TypeScript compiled, local raw-storage boundary, module routes and private file rejection. This does not execute Chromium or prove E2E.');
} finally {await fixture.close();}
