import {releaseIssues} from './release-check.mjs';
import {productionRef} from './environment.mjs';
const profile=process.env.EAS_BUILD_PROFILE??'';
if(profile.startsWith('production')) {
 const issues=releaseIssues(process.env,{platform:process.env.EAS_BUILD_PLATFORM??'android'});
 if(issues.length){console.error(issues.join('\n'));process.exitCode=1;}
} else if(profile.startsWith('qa')) {
 const url=process.env.EXPO_PUBLIC_SUPABASE_URL??'';
 if(!url||url.includes(productionRef)||process.env.EXPO_PUBLIC_APP_ENV!=='staging'||!process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_')||process.env.EXPO_PUBLIC_DEMO==='1'||process.env.EXPO_PUBLIC_SHOWCASE==='1') {
  console.error('Build QA exige backend staging separado, chave publicável e demonstração desligada no ambiente preview do EAS.');process.exitCode=1;
 }
 if(process.env.EAS_BUILD_PLATFORM==='android'&&!process.env.GOOGLE_MAPS_ANDROID_API_KEY) {
  console.error('Build QA Android exige chave Maps para validar o mapa nativo.');process.exitCode=1;
 }
}
