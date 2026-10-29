import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const fileEnv=Object.fromEntries(readFileSync(new URL('../.env',import.meta.url),'utf8').split(/\r?\n/).filter(line=>line && !line.startsWith('#') && line.includes('=')).map(line=>{const at=line.indexOf('=');return [line.slice(0,at),line.slice(at+1).trim().replace(/^['"]|['"]$/g,'')];}));
const email=process.env.ELAS_TEST_EMAIL, password=process.env.ELAS_TEST_PASSWORD;
if(!email || !password) throw new Error('Defina ELAS_TEST_EMAIL e ELAS_TEST_PASSWORD no terminal para usar uma conta de teste.');
const client=createClient(fileEnv.EXPO_PUBLIC_SUPABASE_URL,fileEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
const body={bounds:{south:-28.686,west:-49.377,north:-28.670,east:-49.361}};
try {
  const login=await client.auth.signInWithPassword({email,password});
  if(login.error) throw new Error('Não foi possível entrar com a conta de teste.');
  const first=await client.functions.invoke('lugares-osm',{body});
  assert.equal(first.error,null,'Função deve aceitar a sessão autenticada.');
  assert.ok(!first.data.warning,first.data.warning);
  const osm=first.data.places.filter(place=>place.origem==='osm');
  assert.ok(osm.length>0,'Nenhum lugar OSM foi retornado.');
  const ids=first.data.places.map(place=>place.id);
  assert.equal(new Set(ids).size,ids.length,'IDs duplicados.');
  const refs=osm.map(place=>place.referencia_externa);
  assert.equal(new Set(refs).size,refs.length,'Referências OSM duplicadas.');
  const persisted=await client.from('lugares').select('id,referencia_externa').eq('id',osm[0].id).single();
  assert.equal(persisted.error,null);
  assert.equal(persisted.data.referencia_externa,osm[0].referencia_externa);
  const repeated=await client.functions.invoke('lugares-osm',{body});
  assert.equal(repeated.error,null);assert.ok(!repeated.data.warning);
  assert.deepEqual(repeated.data.places.map(place=>place.id),ids,'Consulta repetida deve preservar os IDs.');
  const invalid=await client.functions.invoke('lugares-osm',{body:{bounds:{...body.bounds,north:0}}});
  assert.equal(invalid.error?.context?.status,422);
  const anon=createClient(fileEnv.EXPO_PUBLIC_SUPABASE_URL,fileEnv.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
  const denied=await anon.functions.invoke('lugares-osm',{body});
  assert.equal(denied.error?.context?.status,401);
  console.log(JSON.stringify({verificado_em:new Date().toISOString(),lugares_osm:osm.length,total:first.data.places.length,persistencia:true,ids_estaveis:true,area_invalida:422,sem_login:401,amostra:osm.slice(0,5).map(place=>({nome:place.nome,referencia:place.referencia_externa}))},null,2));
} finally { await client.auth.signOut({scope:'local'}); }
