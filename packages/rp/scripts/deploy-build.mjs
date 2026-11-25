import { execFileSync } from 'node:child_process';
if (process.env.GITHUB_REPOSITORY) execFileSync(process.execPath, ['scripts/restore-snapshots.mjs'], { stdio: 'inherit' });
else console.log('未配置 GITHUB_REPOSITORY，本次只构建当前原型；历史归档需提前恢复到 .prototype-archives/。');
if (process.env.GITHUB_REPOSITORY) execFileSync(process.execPath, ['scripts/sync-handoffs.mjs'], { stdio: 'inherit' });
execFileSync('pnpm', ['build:site'], { stdio: 'inherit' });
