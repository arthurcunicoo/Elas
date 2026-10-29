import {spawn} from 'node:child_process';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),expo=require.resolve('expo/bin/cli');
const child=spawn(process.execPath,[expo,'start','--clear',...process.argv.slice(2)],{
 env:{...process.env,EXPO_PUBLIC_DEMO:'0',EXPO_PUBLIC_SHOWCASE:'1',EXPO_PUBLIC_APP_ENV:'presentation'},stdio:'inherit',
});
child.on('error',()=>{console.error('Não foi possível abrir o Expo. Execute npm ci antes de iniciar.');process.exitCode=1;});
child.on('exit',code=>{process.exitCode=code??1;});
