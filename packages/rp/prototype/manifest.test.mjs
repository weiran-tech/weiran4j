import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assembleManifest } from './manifest.mjs';
const index = { current: 'v1.1', activeVersion: 'v1.1' };
const files = () => ({
    'prototype/versions/v1.0/version.json': { id: 'v1.0', status: 'completed' },
    'prototype/versions/v1.1/version.json': { id: 'v1.1', status: 'in_progress' },
    'prototype/versions/v1.1/changes/orders.json': { pageId: 'orders', changes: [{ id: 'CHG-010', platform: 'manage' }, { id: 'CHG-002', platform: 'manage' }] },
});
test('按版本和页面组装，CHG 继承 pageId 并按数字编号排序', () => {
    const source = files(); const result = assembleManifest(index, source);
    assert.deepEqual(result.releases.map(item => item.id), ['v1.1', 'v1.0']);
    assert.deepEqual(result.releases[0].changes.map(item => [item.id, item.pageId]), [['CHG-002', 'orders'], ['CHG-010', 'orders']]);
    assert.deepEqual(result.releases[1].changes, []);
    assert.equal(source['prototype/versions/v1.1/changes/orders.json'].changes[0].pageId, undefined);
});
test('拒绝不匹配的版本目录、页面文件名、重复 pageId 与无元信息分组', () => {
    const cases = [
        source => { source['prototype/versions/v1.1/version.json'].id = 'v2.0'; },
        source => { source['prototype/versions/v1.1/changes/orders.json'].pageId = 'other'; },
        source => { source['prototype/versions/v1.1/changes/orders.json'].changes[0].pageId = 'orders'; },
        source => { delete source['prototype/versions/v1.1/version.json']; },
        source => { source['prototype/versions/v1.1/changes/orders.json'].changes = []; },
    ];
    for (const mutate of cases) { const source = files(); mutate(source); assert.throws(() => assembleManifest(index, source)); }
    assert.throws(() => assembleManifest({ ...index, releases: [] }, files()), /只允许/);
});
