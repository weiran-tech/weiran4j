import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root), 'utf8');
test('原型仅保留本机评审，构建发布不依赖远程评审服务', () => {
    for (const path of ['scripts/discussion-api.mjs', 'scripts/check-release-gate.mjs', 'scripts/sync-handoffs.mjs', 'prototype/reviews.json', 'prototype/discussions.json']) {
        assert.equal(existsSync(new URL(path, root)), false, path);
    }
    const scripts = JSON.parse(read('package.json')).scripts;
    for (const name of ['release:check', 'handoff:sync', 'handoff:pull', 'handoff:prepare', 'version:review']) assert.equal(scripts[name], undefined);
    for (const name of readdirSync(new URL('.github/workflows/', root))) {
        assert.doesNotMatch(read(`.github/workflows/${name}`), /issues: read|discussions: read|handoff:sync/);
    }
    assert.doesNotMatch(read('scripts/snapshot.mjs'), /releaseGate|readReview|reviewComments/);
    assert.match(read('scripts/snapshot.mjs'), /implementationRef/);
    assert.doesNotMatch(read('scripts/assemble-site.mjs'), /handoffs\/index/);
    assert.doesNotMatch(read('src/prototype/review-capture.ts'), /Discussion|github\.com\/.*\/(issues|discussions)/);
});
