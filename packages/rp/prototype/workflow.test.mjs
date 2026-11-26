import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from './history/releases-before-source-workflow.json' with { type: 'json' };
import { mergeTransfer, releaseTransfer } from './transfer.mjs';
import { resetDemo } from './demo-reset.mjs';
import { previewTarget } from './model.mjs';
const release = catalog.releases[0];
test('单版三方导入保留其他版本，来源过期冲突需显式选择', () => {
    const incoming = structuredClone(release); incoming.goal = '产品改动的目标';
    const current = structuredClone(catalog); current.releases[0].goal = '研发刚同步的目标';
    const transfer = releaseTransfer(incoming, release);
    const result = mergeTransfer(transfer, current);
    assert.equal(result.conflicts.length, 1); assert.equal(result.catalog.releases[0].goal, current.releases[0].goal);
    const merged = mergeTransfer(transfer, current, { [`${release.id}.goal`]: 'incoming' });
    assert.equal(merged.catalog.releases[0].goal, incoming.goal);
    assert.deepEqual(merged.catalog.releases.slice(1), current.releases.slice(1));
    const old = structuredClone(catalog); old.releases[0].goal = '无来源旧 JSON';
    assert.ok(mergeTransfer(old, current).conflicts.length);
});
test('新交接包可无冲突导入，不能修改定稿记录', () => {
    const incoming = structuredClone(release); incoming.title = '仅修改标题';
    assert.equal(mergeTransfer(releaseTransfer(incoming, release), catalog).conflicts.length, 0);
    const finalized = catalog.releases.find((item) => item.status === 'finalized');
    assert.throws(() => mergeTransfer({ ...finalized, title: '篡改定稿' }, catalog), /定稿/);
});
test('固定候选运行时优先使用自身路径，原型版本不被候选编号冒充', () => {
    const id = 'v0.5-rc-' + 'a'.repeat(40); const base = `/releases/${id}/`;
    const target = previewTarget(release, [{ version: id, prototypeVersion: release.id, kind: 'candidate', base }], release.id, base, '/prototype/workflow');
    assert.ok(target.url.startsWith(base)); assert.ok(target.url.includes(`version=${release.id}`));
});
test('对比重置只清所选版本的退款示例，不清会话或其他业务数据', () => {
    const removed = []; resetDemo({ removeItem: (key) => removed.push(key) }, ['v0.2', 'v0.5', 'v0.5']);
    assert.deepEqual(removed, ['prototype_refund_v0.2', 'prototype_mobile_v0.2', 'prototype_refund_v0.5', 'prototype_mobile_v0.5']);
});
