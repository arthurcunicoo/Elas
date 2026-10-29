export async function verifyIosBuild({command,element,session,expectedHost,os}) {
 const deepLink=url=>command('POST',`/session/${session}/execute/sync`,{script:'mobile: deepLink',args:[{url,bundleId:'br.com.elasnacidade.app.qa'}]});
 const text=async id=>String(await command('GET',`/session/${session}/element/${await element(id)}/attribute/label`));
 await deepLink('elas-qa://diagnostico');
 if(await text('qa-backend')!==`Backend: ${expectedHost}`)throw Error('A build instalada não aponta para o staging declarado.');
 const scale=(await text('qa-font-scale')).match(/Escala de fonte: ([\d.]+)/),build=(await text('qa-build')).match(/^App: ([^ ]+) \| build: ([^ ]+)$/);
 if(!scale||!Number.isFinite(Number(scale[1]))||Number(scale[1])<=0||!build||build.slice(1).includes('unknown')||!os||os==='unknown')throw Error('Diagnóstico sem fonte/build/OS reais. Reconstrua a versão QA.');
 return {backendHost:expectedHost,fontScale:Number(scale[1]),appVersion:build[1],build:build[2],os};
}
