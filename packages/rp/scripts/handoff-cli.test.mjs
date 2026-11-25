import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { handoffMarkdown, blankHandoff } from '../prototype/handoff.mjs';
import catalog from '../prototype/releases.json' with { type: 'json' };
const root = fileURLToPath(new URL('../', import.meta.url));
test('缺少部署凭证时明确报告产物完成、线上未更新，不误报 READY', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prototype-deploy-result-'));
    try {
        const summary = join(dir, 'summary.md'), output = join(dir, 'output');
        execFileSync(process.execPath, [join(root, 'scripts/deploy-static.mjs')], { cwd: dir, env: { ...process.env, VERCEL_TOKEN: '', GITHUB_STEP_SUMMARY: summary, GITHUB_OUTPUT: output }, stdio: 'pipe' });
        assert.match(await readFile(summary, 'utf8'), /线上未更新/); assert.match(await readFile(output, 'utf8'), /deployment_status=artifact_only/);
        assert.doesNotMatch(await readFile(output, 'utf8'), /deployment_status=ready/);
    } finally { await rm(dir, { recursive: true, force: true }); }
});
test('版本登记拒绝不匹配或复用的 Issue，准确主 Issue 才可落盘', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prototype-register-'));
    try {
        await mkdir(join(dir, 'prototype'));
        const release = structuredClone(catalog.releases[0]);
        await writeFile(join(dir, 'prototype/releases.json'), JSON.stringify({ current: release.id, releases: [release] }));
        await writeFile(join(dir, 'prototype/reviews.json'), JSON.stringify({ old: 8 }));
        const body = handoffMarkdown(blankHandoff(release), release);
        const run = (number, issueBody) => spawnSync(process.execPath, ['--input-type=module', '-e', `process.argv.push('register',${JSON.stringify(release.id)},${JSON.stringify(number)});globalThis.fetch=async()=>Response.json({state:'open',body:${JSON.stringify(issueBody)}});await import(${JSON.stringify(new URL('./review-register.mjs', import.meta.url).href)});`], { cwd: dir, encoding: 'utf8' });
        assert.notEqual(run('9', body.replaceAll(release.id, 'v-other')).status, 0);
        assert.notEqual(run('8', body).status, 0);
        assert.equal(run('9', body).status, 0);
        assert.equal(JSON.parse(await readFile(join(dir, 'prototype/reviews.json'), 'utf8'))[release.id], 9);
    } finally { await rm(dir, { recursive: true, force: true }); }
});
test('共享前遇到并行冲突移除旧就绪正文，只提供实时包与冲突清单', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prototype-prepare-'));
    try {
        await mkdir(join(dir, 'prototype')); await mkdir(join(dir, '.prototype-data'));
        const release = structuredClone(catalog.releases[0]); const base = blankHandoff(release); const mine = structuredClone(base), remote = structuredClone(base);
        mine.changes[0].owner = 'local'; remote.changes[0].owner = 'remote';
        await writeFile(join(dir, 'prototype/releases.json'), JSON.stringify({ current: release.id, releases: [release] }));
        await writeFile(join(dir, 'prototype/review-policy.json'), JSON.stringify({ product: [], technical: [] }));
        await writeFile(join(dir, 'input.json'), JSON.stringify({ kind: 'prototype-handoff', version: release.id, base, draft: mine }));
        const target = join(dir, '.prototype-data', release.id + '-handoff'); await writeFile(target + '-ready.md', '过期就绪正文');
        const body = handoffMarkdown(remote, release);
        const result = spawnSync(process.execPath, ['--input-type=module', '-e', `process.argv.push('exchange','prepare','input.json');globalThis.fetch=async()=>Response.json({body:${JSON.stringify(body)},updated_at:'2026-11-23T03:00:00Z'});await import(${JSON.stringify(new URL('./handoff-exchange.mjs', import.meta.url).href)});`], { cwd: dir, encoding: 'utf8' });
        assert.notEqual(result.status, 0); assert.match(result.stderr, /并行修改/);
        await assert.rejects(readFile(target + '-ready.md'), { code: 'ENOENT' });
        assert.equal(JSON.parse(await readFile(target + '-latest.json', 'utf8')).draft.changes[0].owner, 'remote');
        assert.equal(JSON.parse(await readFile(target + '-conflicts.json', 'utf8')).length, 1);
    } finally { await rm(dir, { recursive: true, force: true }); }
});

test('Discussion 登记核对结构化版本后写本地 JSON，不更改旧 Issue 登记', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'prototype-discussion-register-'));
    try {
        await mkdir(join(dir, 'prototype'));
        const release = structuredClone(catalog.releases[0]);
        await writeFile(join(dir, 'prototype/releases.json'), JSON.stringify({ current: release.id, releases: [release] }));
        await writeFile(join(dir, 'prototype/discussions.json'), '{}');
        await writeFile(join(dir, 'prototype/reviews.json'), JSON.stringify({ [release.id]: 5 }));
        const run = (version) => spawnSync(process.execPath, ['--input-type=module', '-e', `process.argv.push('register',${JSON.stringify(release.id)},'discussion:17');globalThis.fetch=async()=>Response.json({data:{repository:{discussion:{number:17,body:${JSON.stringify(handoffMarkdown(blankHandoff(release), release).replaceAll(release.id, version))},closed:false}}}});await import(${JSON.stringify(new URL('./review-register.mjs', import.meta.url).href)});`], { cwd: dir, encoding: 'utf8' });
        assert.notEqual(run('v-other').status, 0);
        assert.equal(run(release.id).status, 0);
        assert.equal(JSON.parse(await readFile(join(dir, 'prototype/discussions.json'), 'utf8'))[release.id], 17);
        assert.equal(JSON.parse(await readFile(join(dir, 'prototype/reviews.json'), 'utf8'))[release.id], 5);
    } finally { await rm(dir, { recursive: true, force: true }); }
});
