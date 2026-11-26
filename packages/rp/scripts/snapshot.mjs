import { readManifest } from './load-prototype.mjs';
import { execFileSync } from 'node:child_process';
import { access, cp, mkdir, readFile } from 'node:fs/promises';
import { reviewFingerprint } from './review-fingerprint.mjs';
import { releaseGate } from './check-release-gate.mjs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = readManifest();
const candidate = process.argv.includes('--candidate');
const version = process.argv.slice(2).find((value) => value !== '--' && value !== '--candidate') || catalog.current;
const release = catalog.releases.find((item) => item.id === version);
if (!release || (!candidate && release.status !== 'finalized') || (candidate && release.status !== 'review') || version !== catalog.current) throw new Error('只能归档已定稿的当前版本：先将状态改为 finalized，提交代码并打同名 tag');
execFileSync('node', ['scripts/check-versions.mjs'], { cwd: root, stdio: 'inherit' });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
if (!candidate) {
    const tagCommit = execFileSync('git', ['rev-list', '-n', '1', version], { cwd: root, encoding: 'utf8' }).trim();
    if (commit !== tagCommit) throw new Error('当前 HEAD 必须与版本 tag 指向同一提交');
    let mainRef = 'origin/main'; try { execFileSync('git', ['rev-parse', '--verify', 'refs/remotes/github/main'], { cwd: root, stdio: 'ignore' }); mainRef = 'github/main'; } catch { /* Actions checkout 使用 origin */ }
    execFileSync('git', ['merge-base', '--is-ancestor', commit, mainRef], { cwd: root });
    await releaseGate(release);
}
if (execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()) throw new Error('请先提交改动再归档');
const archiveId = candidate ? `${version}-rc-${commit}` : version;
const fingerprint = reviewFingerprint(root);
const destination = new URL(`../.prototype-archives/${archiveId}/`, import.meta.url);
let exists = false;
try { await access(destination); exists = true; const old = JSON.parse(await readFile(new URL('prototype-build.json', destination), 'utf8')); if (old.commit !== commit || old.version !== archiveId || old.fingerprint !== fingerprint) throw new Error('已有归档内容不匹配，拒绝覆盖'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const env = { ...process.env, VITE_PROTOTYPE_VERSION: version, VITE_PROTOTYPE_ARCHIVE_ID: archiveId, VITE_PROTOTYPE_KIND: candidate ? 'candidate' : 'finalized', VITE_PROTOTYPE_FINGERPRINT: fingerprint, VITE_PROTOTYPE_BASE: `/releases/${archiveId}/` };
if (!exists) {
execFileSync('pnpm', ['build:web'], { cwd: root, env, stdio: 'inherit' });
await mkdir(destination, { recursive: true });
await cp(new URL('../.prototype-data/web-build/', import.meta.url), destination, { recursive: true });
}
await mkdir(new URL('../.prototype-artifacts/', import.meta.url), { recursive: true });
const artifact = fileURLToPath(new URL(`../.prototype-artifacts/${archiveId}.tar.gz`, import.meta.url));
execFileSync('tar', ['-czf', artifact, '-C', fileURLToPath(new URL('../.prototype-archives/', import.meta.url)), archiveId], { stdio: 'inherit' });
console.log(`已保存不可变快照：${artifact}`);
