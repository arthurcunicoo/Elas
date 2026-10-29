import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {createClient} from '@supabase/supabase-js';
import {productionRef} from '../qa/environment.mjs';
const [mode,directory]=process.argv.slice(2),url=process.env.STORAGE_ADMIN_URL,key=process.env.STORAGE_ADMIN_KEY;
if(!directory||!['backup','restore'].includes(mode)||!url||!key)throw Error('Use backup|restore DIRETÓRIO, com STORAGE_ADMIN_URL e STORAGE_ADMIN_KEY em ambiente protegido.');
if(!key.startsWith('sb_secret_')){try{if(JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString()).role!=='service_role')throw Error();}catch{throw Error('Use uma credencial administrativa do servidor, nunca a chave publicável do aplicativo.');}}
const origin=new URL(url);if(origin.protocol!=='https:'||!origin.hostname.endsWith('.supabase.co'))throw Error('Origem Supabase inválida.');
if(mode==='restore'&&(origin.hostname===`${productionRef}.supabase.co`||process.env.RESTORE_CONFIRM!=='disposable-staging'))throw Error('Restauração de Storage exige staging descartável; produção bloqueada.');
process.umask(0o077);const root=path.resolve(directory),client=createClient(url,key,{auth:{persistSession:false,autoRefreshToken:false}});
const digest=buffer=>createHash('sha256').update(buffer).digest('hex');
function local(relative){const target=path.resolve(root,relative);if(!target.startsWith(root+path.sep)||relative.split(/[\\/]/).includes('..'))throw Error('Nome de objeto inválido.');return target;}
if(mode==='backup'){
 fs.mkdirSync(root,{recursive:false,mode:0o700});const buckets=await client.storage.listBuckets();if(buckets.error)throw Error('Não foi possível listar buckets.');const objects=[];
 for(const bucket of buckets.data){
  async function collect(prefix=''){
   for(let offset=0;;offset+=1000){const list=await client.storage.from(bucket.id).list(prefix,{limit:1000,offset,sortBy:{column:'name',order:'asc'}});if(list.error)throw Error('Listagem de Storage falhou.');
    for(const item of list.data){const name=prefix?prefix+'/'+item.name:item.name;if(item.id===null){await collect(name);continue;}const downloaded=await client.storage.from(bucket.id).download(name);if(downloaded.error)throw Error('Download de Storage falhou.');const bytes=Buffer.from(await downloaded.data.arrayBuffer()),file=path.join('objects',bucket.id,name),target=local(file);fs.mkdirSync(path.dirname(target),{recursive:true,mode:0o700});fs.writeFileSync(target,bytes,{mode:0o600});objects.push({bucket:bucket.id,name,file:file.replaceAll(path.sep,'/'),contentType:downloaded.data.type,bytes:bytes.length,sha256:digest(bytes)});}
    if(list.data.length<1000)break;
   }
  }
  await collect();
 }
 fs.writeFileSync(path.join(root,'objects.json'),JSON.stringify({version:1,buckets:buckets.data.map(({id,name,public:visible,file_size_limit,allowed_mime_types})=>({id,name,public:visible,file_size_limit,allowed_mime_types})),objects},null,2),{mode:0o600});console.log('Objetos e configurações de buckets copiados. Verifique os hashes e mantenha o diretório protegido.');
}else{
 const manifest=JSON.parse(fs.readFileSync(path.join(root,'objects.json'),'utf8'));if(manifest.version!==1||!Array.isArray(manifest.objects))throw Error('Manifesto de Storage inválido.');
 // Check every byte before writing anything to the disposable target.
 for(const item of manifest.objects){const bytes=fs.readFileSync(local(item.file));if(bytes.length!==item.bytes||digest(bytes)!==item.sha256)throw Error('Integridade de Storage falhou.');}
 const existing=await client.storage.listBuckets();if(existing.error)throw Error('Não foi possível listar o destino.');
 for(const bucket of manifest.buckets){const prior=existing.data.find(row=>row.id===bucket.id);if(prior){if(prior.public!==bucket.public)throw Error('Bucket de destino tem visibilidade diferente do backup.');continue;}const created=await client.storage.createBucket(bucket.id,{public:bucket.public,fileSizeLimit:bucket.file_size_limit??undefined,allowedMimeTypes:bucket.allowed_mime_types??undefined});if(created.error)throw Error('Criação de bucket falhou.');}
 for(const item of manifest.objects){const uploaded=await client.storage.from(item.bucket).upload(item.name,fs.readFileSync(local(item.file)),{upsert:true,contentType:item.contentType||'application/octet-stream'});if(uploaded.error)throw Error('Upload no destino falhou.');}
 console.log('Storage copiado para staging. Valide leitura autenticada, nomes, bytes e permissões.');
}
