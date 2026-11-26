import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSourceWorkflow, frozenBaselineErrors } from './source-workflow.mjs';
const page = { id: 'orders', title: '订单', platform: 'manage', path: '/manage/orders', files: ['src/pages/orders.tsx'] };
const active = { id: 'v1.1', status: 'in_progress', baseline: 'v1.0', editBase: 'a'.repeat(40), changes: [{ id: 'CHG-001', pageId: 'orders', pageTitle: '订单', page: '/manage/orders', platform: 'manage', files: ['src/mocks/orders.ts'] }] };
const baseline = { id: 'v1.0', status: 'completed', baseline: null, changes: [] };
const manifest = () => ({ workflowSchema: 2, current: 'v1.1', activeVersion: 'v1.1', releases: [structuredClone(active), structuredClone(baseline)] });
const registry = { pages: [page] };
test('唯一进行中版本覆盖页面及共享 Mock，缺少 CHG 或活动版本时拒绝', () => {
    const data = manifest();
    assert.deepEqual(validateSourceWorkflow(data, registry, ['src/pages/orders.tsx', 'src/mocks/orders.ts']), []);
    data.releases[0].changes = [];
    assert.match(validateSourceWorkflow(data, registry, ['src/pages/orders.tsx']).join(), /CHG/);
    data.releases[0].status = 'completed'; data.activeVersion = null;
    assert.match(validateSourceWorkflow(data, registry, ['src/pages/orders.tsx']).join(), /没有进行中版本/);
});
test('不允许第二个进行中版本、不存在的页面与跨版本活动指针', () => {
    const data = manifest(); data.releases.push({ ...active, id: 'v1.2' });
    assert.match(validateSourceWorkflow(data, registry).join(), /只允许一个/);
    data.releases.pop(); data.current = 'v1.0';
    assert.match(validateSourceWorkflow(data, registry).join(), /current/);
    data.current = 'v1.1'; data.releases[0].changes[0].pageId = 'missing';
    assert.match(validateSourceWorkflow(data, registry).join(), /稳定页面/);
});
test('完结须绑定实现提交，已完结版本不能改写或删除', () => {
    const previous = manifest(); const next = manifest();
    next.releases[0].status = 'completed'; next.activeVersion = null;
    assert.match(validateSourceWorkflow(next, registry, [], previous).join(), /implementationRef/);
    next.releases[0].implementationRef = 'b'.repeat(40);
    assert.deepEqual(validateSourceWorkflow(next, registry, [], previous), []);
    const changed = structuredClone(next); changed.releases[0].changes = [];
    assert.match(validateSourceWorkflow(changed, registry, [], next).join(), /不可改写/);
    changed.releases.pop();
    assert.match(validateSourceWorkflow(changed, registry, [], next).join(), /不可改写/);
});
test('未完成版本不能作基线，过宽文件范围不能掩盖未登记改动', () => {
    const data = manifest(); data.releases[1].status = 'in_progress'; data.releases[0].changes[0].files = ['src/**'];
    const errors = validateSourceWorkflow(data, registry).join();
    assert.match(errors, /基线必须已完结/); assert.match(errors, /范围过宽/);
});

test('禁止通过挪动 editBase 隐藏变动，固定基线不能被覆盖', () => {
    const previous = manifest(); const next = manifest(); next.releases[0].editBase = 'c'.repeat(40);
    assert.match(validateSourceWorkflow(next, registry, [], previous).join(), /不可挪动 editBase/);
    const frozen = { 'v1.0': { pages: [page] } };
    assert.deepEqual(frozenBaselineErrors(frozen, structuredClone(frozen)), []);
    assert.match(frozenBaselineErrors(frozen, {}).join(), /固定基线不可改写/);
    assert.match(frozenBaselineErrors(frozen, { 'v1.0': { pages: [] } }).join(), /固定基线不可改写/);
});
