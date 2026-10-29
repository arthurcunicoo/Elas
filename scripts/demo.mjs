import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const expo = require.resolve('expo/bin/cli');
const child = spawn(process.execPath, [expo, 'start', ...process.argv.slice(2)], { env: { ...process.env, EXPO_PUBLIC_DEMO: '1' }, stdio: 'inherit' });
child.on('exit', code => { process.exitCode = code ?? 1; });
