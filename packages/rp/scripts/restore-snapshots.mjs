/** 仅在构建时使用 GitHub 凭证；归档中不包含凭证。 */
import { execFileSync } from 'node:child_process';
import { mkdir, readdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
const repo = process.env.GITHUB_REPOSITORY;
if (!repo || !/^[\w.-]+\/[\w.-]+$/.test(repo)) throw new Error('请设置 GITHUB_REPOSITORY=owner/repo');
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
async function api(path, binary = false) {
    const response = await fetch(`https://api.github.com/${path}`, { headers: { Accept: binary ? 'application/octet-stream' : 'application/vnd.github+json', ...(token ? { Authorization: `Bearer ${token}` } : {}), 'X-GitHub-Api-Version': '2022-11-28' } });
    if (!response.ok) throw new Error(`GitHub 归档读取失败（HTTP ${response.status}）`);
    return binary ? Buffer.from(await response.arrayBuffer()) : response.json();
}
const releases = [];
for (let page = 1; ; page++) {
    const items = await api(`repos/${repo}/releases?per_page=100&page=${page}`);
    releases.push(...items); if (items.length < 100) break;
}
await mkdir('.prototype-archives', { recursive: true });
for (const release of releases) {
    if (release.draft || !/^v[\w.-]+$/.test(release.tag_name)) continue;
    const name = `${release.tag_name}.tar.gz`;
    const asset = release.assets.find((item) => item.name === name);
    if (!asset) continue;
    const temp = await mkdtemp(join(tmpdir(), 'prototype-archive-'));
    try {
        const artifact = join(temp, name);
        await writeFile(artifact, await api(`repos/${repo}/releases/assets/${asset.id}`, true));
        const entries = execFileSync('tar', ['-tzf', artifact], { encoding: 'utf8' }).trim().split('\n');
        if (entries.some((path) => !path.startsWith(`${release.tag_name}/`) || path.split('/').includes('..') || path.startsWith('/'))) throw new Error(`归档路径无效：${name}`);
        const details = execFileSync('tar', ['-tvzf', artifact], { encoding: 'utf8' });
        if (details.split('\n').some((line) => line && !['-', 'd'].includes(line[0]))) throw new Error(`归档包含非常规文件：${name}`);
        if ((await readdir('.prototype-archives')).includes(release.tag_name)) throw new Error(`拒绝覆盖已有快照：${release.tag_name}`);
        execFileSync('tar', ['-xzf', artifact, '-C', '.prototype-archives'], { stdio: 'inherit' });
    } finally { await rm(temp, { recursive: true, force: true }); }
}
console.log(`已检查 ${releases.length} 个 GitHub Release。`);
