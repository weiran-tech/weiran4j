import { readFile, mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { repository } from '../prototype/project.mjs';
const id = process.argv[2]; if (!/^v[\w.-]+$/.test(id || '')) throw new Error('归档编号无效');
const expected = JSON.parse(await readFile(`.prototype-archives/${id}/prototype-build.json`, 'utf8'));
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
const headers = { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' };
const response = await fetch(`https://api.github.com/repos/${repository}/releases/tags/${id}`, { headers });
if (response.status === 404) {
    const args = ['release', 'create', id, `.prototype-artifacts/${id}.tar.gz`, '--repo', repository, '--title', id, '--notes', expected.kind === 'candidate' ? `固定评审候选；原型 ${expected.prototypeVersion}，提交 ${expected.commit}。不代表产品批准。` : '已通过产品与技术评审门禁的定稿原型；禁止覆盖。'];
    if (expected.kind === 'candidate') args.push('--target', expected.commit, '--prerelease'); else args.push('--verify-tag');
    execFileSync('gh', args, { stdio: 'inherit' });
} else {
    if (!response.ok) throw new Error(`发布查询失败（HTTP ${response.status}）`);
    const release = await response.json();
    const asset = release.assets.find((item) => item.name === `${id}.tar.gz`);
    if (!asset) throw new Error('Release 已存在但附件缺失，请核对准确 tag 后人工恢复；不自动替换');
    const binary = await fetch(`https://api.github.com/repos/${repository}/releases/assets/${asset.id}`, { headers: { ...headers, Accept: 'application/octet-stream' } });
    if (!binary.ok) throw new Error('已有归档无法校验，停止重跑');
    const directory = await mkdtemp(join(tmpdir(), 'prototype-publish-'));
    try {
        const file = join(directory, 'existing.tar.gz'); await writeFile(file, Buffer.from(await binary.arrayBuffer()));
        const actual = JSON.parse(execFileSync('tar', ['-xOzf', file, `${id}/prototype-build.json`], { encoding: 'utf8' }));
        if (actual.version !== id || actual.commit !== expected.commit || actual.fingerprint !== expected.fingerprint || actual.kind !== expected.kind) throw new Error('已有归档与本次提交不一致，拒绝覆盖');
        console.log('已有不可变归档校验通过，保留原附件并继续组装站点。');
    } finally { await rm(directory, { recursive: true, force: true }); }
}
