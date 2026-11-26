import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync, spawnSync } from 'node:child_process';
const [tarball, tag] = process.argv.slice(2);
if (!tarball || !['latest', 'next'].includes(tag)) throw new Error('需要 tarball 与合法 dist-tag');
const pkg = JSON.parse(execFileSync('tar', ['-xOzf', tarball, 'package/package.json'], { encoding: 'utf8' }));
if (!['@weiran-tech/manage', '@weiran-tech/prototype'].includes(pkg.name)) throw new Error('拒绝发布非组件包');
const result = spawnSync('npm', ['view', `${pkg.name}@${pkg.version}`, 'dist.integrity', '--json', '--registry=https://registry.npmjs.org'], { encoding: 'utf8' });
if (result.error) throw result.error;
if (result.status === 0) {
    const integrity = 'sha512-' + createHash('sha512').update(readFileSync(tarball)).digest('base64');
    if (JSON.parse(result.stdout) !== integrity) throw new Error('npm 上已有同版本的不同内容，禁止覆盖；请升级包版本');
    console.log(`${pkg.name}@${pkg.version} 已发布且内容相同，跳过重复发布`);
} else {
    if (!/E404/.test(result.stderr + result.stdout)) throw new Error('无法确认 npm 版本状态，停止发布');
    execFileSync('npm', ['publish', tarball, '--access', 'public', '--tag', tag], { stdio: 'inherit' });
}
