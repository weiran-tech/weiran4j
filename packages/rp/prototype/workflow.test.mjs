import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from './releases.json' with { type: 'json' };
import { mergeTransfer, releaseTransfer } from './transfer.mjs';
import { blankHandoff, handoffErrors, handoffMarkdown, parseHandoff, approvalErrors, approvalCommand } from './handoff.mjs';
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
test('交接记录序列化可回读，未验收、缺条件、假通过不能交付', () => {
    const draft = blankHandoff(release);
    assert.deepEqual(parseHandoff(handoffMarkdown(draft, release)), draft);
    draft.changes[0].state = 'accepted'; assert.ok(handoffErrors(draft, release).some((error) => error.includes('证据')));
    draft.changes[0].state = 'working'; draft.phase = 'delivered'; assert.ok(handoffErrors(draft, release).some((error) => error.includes('交付')));
    draft.changes.pop(); assert.ok(handoffErrors(draft, release).some((error) => error.includes('全部 CHG')));
});
test('批准绑定 GitHub 本人、准确候选和业务指纹，换候选或撤回即失效', () => {
    const candidate = { version: 'v0.5-rc-' + 'a'.repeat(40), fingerprint: 'b'.repeat(64) };
    const handoff = { productOwner: 'pm', technicalOwner: 'dev' }; const policy = { product: ['pm'], technical: ['dev'] };
    const comments = [{ user: { login: 'pm' }, body: approvalCommand('product', candidate), updated_at: '2026-11-23T00:00:00Z' }, { user: { login: 'dev' }, body: approvalCommand('technical', candidate), updated_at: '2026-11-23T00:00:01Z' }];
    assert.deepEqual(approvalErrors(handoff, candidate, comments, policy), []);
    assert.ok(approvalErrors(handoff, { ...candidate, fingerprint: 'c'.repeat(64) }, comments, policy).length);
    assert.ok(approvalErrors(handoff, candidate, [{ ...comments[0], user: { login: 'someone' } }, comments[1]], policy).length);
    comments.push({ user: { login: 'pm' }, body: `/prototype revoke ${candidate.version}`, updated_at: '2026-11-23T00:00:02Z' });
    assert.ok(approvalErrors(handoff, candidate, comments, policy).some((error) => error.includes('撤回')));
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
