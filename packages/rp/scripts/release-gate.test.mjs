import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { versionDiscussions } from '../prototype/project.mjs';
import catalog from '../prototype/releases.json' with { type: 'json' };
import { blankHandoff, handoffMarkdown, approvalCommand } from '../prototype/handoff.mjs';
import { releaseGate } from './check-release-gate.mjs';
import { reviewFingerprint } from './review-fingerprint.mjs';
test('发布门禁实时核对批准、CHG 阻塞问题和业务指纹，未批准或源码改变都拒绝', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'prototype-gate-'));
    const cwd = process.cwd(); const originalFetch = globalThis.fetch;
    const release = { ...structuredClone(catalog.releases.find((item) => item.id === 'v0.5')), status: 'finalized', supersededBy: undefined };
    try {
        await mkdir(join(directory, 'prototype'));
        await writeFile(join(directory, '.gitignore'), '.prototype-archives/\n');
        await writeFile(join(directory, 'prototype/releases.json'), JSON.stringify({ current: release.id, releases: [release] }));
        await writeFile(join(directory, 'prototype/review-policy.json'), JSON.stringify({ product: ['pm'], technical: ['dev'] }));
        await writeFile(join(directory, 'source.js'), 'approved business content');
        const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
        git('init'); git('add', '.'); git('-c', 'user.email=test@example.com', '-c', 'user.name=Test', 'commit', '-m', 'candidate');
        const commit = git('rev-parse', 'HEAD');
        const candidate = { version: `${release.id}-rc-${commit}`, prototypeVersion: release.id, kind: 'candidate', commit, fingerprint: reviewFingerprint(directory) };
        candidate.base = `/releases/${candidate.version}/`;
        await mkdir(join(directory, '.prototype-archives', candidate.version), { recursive: true });
        await writeFile(join(directory, '.prototype-archives', candidate.version, 'prototype-build.json'), JSON.stringify(candidate));
        if (release.baseline) { await mkdir(join(directory, '.prototype-archives', release.baseline), { recursive: true }); await writeFile(join(directory, '.prototype-archives', release.baseline, 'prototype-build.json'), JSON.stringify({ version: release.baseline })); }
        const handoff = { ...blankHandoff(release), phase: 'review', testData: '重置测试数据', productOwner: 'pm', technicalOwner: 'dev', candidateId: candidate.version, candidateCommit: commit, candidateFingerprint: candidate.fingerprint, candidateUrl: `https://prototype.example${candidate.base}prototype/workflow` };
        let comments = [{ user: { login: 'pm' }, body: approvalCommand('product', candidate), updated_at: '2026-11-23T00:00:00Z' }, { user: { login: 'dev' }, body: approvalCommand('technical', candidate), updated_at: '2026-11-23T00:00:01Z' }];
        let blockers = [];
        globalThis.fetch = async (url) => Response.json(String(url).includes('/comments?') ? comments : String(url).includes('labels=') ? blockers : { body: handoffMarkdown(handoff, release) });
        process.chdir(directory);
        await releaseGate(release);
        const issueFetch = globalThis.fetch;
        versionDiscussions[release.id] = 17;
        try {
            globalThis.fetch = async (url, options) => {
                if (!String(url).endsWith('/graphql')) return issueFetch(url, options);
                const { query } = JSON.parse(options.body);
                if (query.includes('discussion(number')) return Response.json({ data: { repository: { discussion: { id: 'D17', number: 17, body: handoffMarkdown(handoff, release), closed: false } } } });
                return Response.json({ data: { node: { ...(query.includes('... on Discussion{') ? { comments: { nodes: comments.map((item, index) => ({ id: `C${index}`, body: item.body, author: item.user, updatedAt: item.updated_at })), pageInfo: { hasNextPage: false } } } : { replies: { nodes: [], pageInfo: { hasNextPage: false } } }) } } });
            };
            await releaseGate(release);
            comments[1].user.login = 'imposter';
            await assert.rejects(releaseGate(release), /技术确认/);
            comments[1].user.login = 'dev';
        } finally { delete versionDiscussions[release.id]; globalThis.fetch = issueFetch; }
        comments = comments.slice(0, 1); await assert.rejects(releaseGate(release), /技术确认/);
        comments.push({ user: { login: 'dev' }, body: approvalCommand('technical', candidate), updated_at: '2026-11-23T00:00:01Z' });
        blockers = [{ number: 9, body: `评审标识：prototype-review:${release.id}:CHG-001\n问题` }]; await assert.rejects(releaseGate(release), /#9/);
        blockers = []; await writeFile(join(directory, 'source.js'), 'changed after approval'); await assert.rejects(releaseGate(release), /不一致/);
    } finally { process.chdir(cwd); globalThis.fetch = originalFetch; await rm(directory, { recursive: true, force: true }); }
});
