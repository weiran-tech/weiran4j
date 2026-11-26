import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readManifest, writeManifest, readGitManifest } from './load-prototype.mjs';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';

test('当前八个版本可拆分回读，已完结元信息与说明无损', () => {
    const source = readManifest(); const root = mkdtempSync(join(tmpdir(), 'rp-json-'));
    try {
        writeManifest(source, root);
        assert.deepEqual(readManifest(root), source);
        const git = (...args) => execFileSync('git', ['-C', root, '-c', 'commit.gpgsign=false', '-c', 'core.hooksPath=/dev/null', ...args], { encoding: 'utf8' }).trim();
        git('init', '-q'); git('config', 'user.name', 'RP test'); git('config', 'user.email', 'rp-test@example.invalid'); git('add', '.'); git('commit', '-qm', 'Split versions');
        assert.deepEqual(readGitManifest(git, 'HEAD'), source);
        const nested = join(root, 'packages/rp');
        writeManifest(source, nested); git('add', '.'); git('commit', '-qm', 'Nested package');
        const nestedGit = (...args) => execFileSync('git', ['-C', nested, ...args], { encoding: 'utf8' }).trim();
        assert.deepEqual(readGitManifest(nestedGit, 'HEAD', 'packages/rp/'), source);
    } finally { rmSync(root, { recursive: true, force: true }); }
});
test('历史 Git 大 JSON 仍可回读，目录前缀不丢失', () => {
    const legacy = { current: 'v0.1', releases: [{ id: 'v0.1', changes: [] }] };
    const calls = [];
    const git = (...args) => { calls.push(args); return JSON.stringify(legacy); };
    assert.deepEqual(readGitManifest(git, 'old', 'packages/rp/'), legacy);
    assert.deepEqual(calls[0], ['show', 'old:packages/rp/prototype/releases.json']);
});
