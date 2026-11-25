import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageConflicts } from './page-conflicts.mjs';

const change = (id, platform = 'manage', type = 'modify') => ({ id, platform, type, pageId: 'orders', page: '/manage/orders', title: '订单', before: '', after: '', rules: [], acceptance: [] });
const release = (id, baseline = 'v1') => ({ id, baseline, status: 'draft', changes: [change('CHG-001')] });
test('相同基线和稳定页面编号提示并行调整，合并同页多个改动', () => {
    const local = release('v2');
    const remote = { ...release('v3'), changes: [change('CHG-002'), { ...change('CHG-003'), page: '/manage/renamed' }] };
    const result = pageConflicts(local, [local, remote]);
    assert.equal(result.length, 1);
    assert.equal(result[0].version, 'v3');
    assert.equal(result[0].remote.length, 2);
});
test('不同基线、不同端、已承接版本及无基线不误报；删除与修改提示', () => {
    const local = release('v2');
    assert.deepEqual(pageConflicts(local, [local, release('v3', 'v0'), { ...release('v4'), changes: [change('M1', 'mobile')] }, { ...release('v5'), supersededBy: 'v6' }]), []);
    assert.deepEqual(pageConflicts(release('v2', null), [release('v3', null)]), []);
    assert.equal(pageConflicts(local, [{ ...release('v3'), changes: [change('D1', 'manage', 'remove')] }]).length, 1);
});
