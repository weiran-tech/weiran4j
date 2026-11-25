import { fileURLToPath } from 'node:url';
import { spawn, execFileSync } from 'node:child_process';
const root = fileURLToPath(new URL('../', import.meta.url));
execFileSync(process.execPath, [fileURLToPath(new URL('./check-versions.mjs', import.meta.url))], { cwd: root, stdio: 'inherit' });
const child = spawn('pnpm', ['exec', 'vite', '--port', '5208', '--strictPort'], { cwd: root, stdio: 'inherit' });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => child.kill(signal));
child.on('error', (error) => { console.error(error.message); process.exit(1); });
child.on('exit', (code) => process.exit(code ?? 1));
