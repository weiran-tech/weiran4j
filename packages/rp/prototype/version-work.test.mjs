import { test } from 'node:test';
import assert from 'node:assert/strict';
import { canDerive, workErrors, conflictFingerprint, unresolvedConflicts } from './version-work.mjs';
const baseline = { id: 'v1', status: 'finalized', baseline: null, changes: [] };
const version = (id) => ({ id, status: 'draft', baseline: 'v1', changes: [{ id: 'CHG-001', pageId: 'orders', platform: 'manage', page: '/manage/orders', title: '订单', after: '修改' }] });
test('待评审和源码基线不能派生，只有定稿版可用', () => {
    assert.equal(canDerive({ status: 'review' }), false);
    assert.equal(canDerive({ status: 'baseline' }), false);
    assert.equal(canDerive(baseline), true);
    assert.match(workErrors(version('v2'), [{ ...baseline, status: 'review' }])[0], /完成评审/);
    assert.match(workErrors(undefined, [baseline])[0], /目标版本/);
});
test('同基线同页必须先解决，解决对双方有效，内容变化后失效', () => {
    const a = version('v2'), b = version('v3'); const releases = [baseline, a, b];
    assert.equal(workErrors(a, releases).length, 1);
    const conflict = unresolvedConflicts(a, releases)[0];
    const resolution = { fingerprint: conflictFingerprint(a, conflict), decision: '已统一退款规则', evidence: 'commit:abc123' };
    assert.deepEqual(workErrors(a, releases, [resolution]), []);
    assert.deepEqual(workErrors(b, releases, [resolution]), []);
    b.changes[0].after = '再次调整';
    assert.equal(workErrors(a, releases, [resolution]).length, 1);
});
test('不同端、不同基线不阻塞，无结论或证据的忽略不算解决', () => {
    const a = version('v2'), b = version('v3'); b.changes[0].platform = 'mobile';
    assert.deepEqual(workErrors(a, [baseline, a, b]), []);
    b.changes[0].platform = 'manage';
    const conflict = unresolvedConflicts(a, [baseline, a, b])[0];
    assert.equal(unresolvedConflicts(a, [baseline, a, b], [{ fingerprint: conflictFingerprint(a, conflict), decision: '忽略', evidence: '' }]).length, 1);
});
