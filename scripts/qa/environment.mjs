export const productionRef='pxcbzjxgxdmdayqwpqcj';
export function requireStaging(env=process.env) {
 const url=new URL(env.QA_SUPABASE_URL??'');
 if(url.username||url.password||url.pathname!=='/'||url.protocol!=='https:'||url.hostname===`${productionRef}.supabase.co`||!url.hostname.endsWith('.supabase.co'))throw Error('Use um projeto Supabase de staging separado do projeto real.');
 if(!env.QA_EMAIL||!env.QA_PASSWORD)throw Error('Configure QA_EMAIL e QA_PASSWORD de uma conta dedicada de staging.');
 return url;
}
export function safeName(value) {if(!/^[a-zA-Z0-9_-]{1,80}$/.test(value??''))throw Error('Nome de aparelho/execução inválido.');return value;}
