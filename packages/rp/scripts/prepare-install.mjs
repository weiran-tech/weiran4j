import { existsSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// 首次迁移独立原型仓库的锁文件；完整工作区使用根锁文件。
const root = fileURLToPath(new URL('../', import.meta.url));
if (!existsSync(new URL('../../component-prototype/package.json', import.meta.url))) {
  const lock = readFileSync(new URL('../pnpm-lock.yaml', import.meta.url), 'utf8');
  if (!lock.includes("'@weiran-tech/prototype':")) {
    console.log('更新独立原型锁文件：请先发布 @weiran-tech/manage 与 @weiran-tech/prototype。');
    const result = spawnSync('pnpm', ['install', '--lockfile-only', '--ignore-scripts', '--no-frozen-lockfile'], {
      cwd: root,
      stdio: 'inherit',
    });
    if (result.error) throw result.error;
    process.exitCode = result.status ?? 1;
  }
}
