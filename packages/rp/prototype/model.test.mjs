import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from './releases.json' with { type: 'json' };
import { baselinePagePath, pageDiffs, previewTarget, contextPath, parseCatalog, validateCatalog, mobilePageChanges, immutableErrors } from './model.mjs';
import { resolveMobilePage } from './mobile-pages.mjs';
const current = catalog.releases.find((item) => item.id === catalog.current);
const old = catalog.releases.find((item) => item.id === current.baseline);
const archives = [{ version: old.id, base: `/releases/${old.id}/`, commit: 'a'.repeat(40), builtAt: '2026-11-23' }];
test('历史手机入口仅使用所选版本快照，缺少快照不退回当前代码', () => {
    const target = previewTarget(old, archives, current.id, '/', '/mobile/#/orders');
    assert.ok(target.url.startsWith(`/releases/${old.id}/mobile/`));
    assert.equal(previewTarget(old, [], current.id, '/', '/mobile/#/orders').url, null);
});
test('新增、删除、改名页面对比区分前后地址，跨代基线沿身份回溯', () => {
    const page = pageDiffs(current).find((item) => item.pageId === 'prototype-refund');
    assert.equal(page.before, '/prototype/refund'); assert.equal(page.after, '/manage/refund-demo');
    assert.equal(baselinePagePath(catalog.releases, current, page, old.id).path, '/prototype/refund');
    assert.equal(baselinePagePath(catalog.releases, current, page, 'v0.1').path, null);
    const added = pageDiffs(current).find((item) => item.pageId === 'prototype-editor');
    assert.equal(baselinePagePath(catalog.releases, current, added, old.id).path, null);
    const removed = { ...current, changes: [{ ...current.changes[0], type: 'remove', previousPage: '/old', nextPage: null, page: '/old' }] };
    const diff = pageDiffs(removed)[0]; assert.equal(diff.after, null);
    assert.equal(previewTarget(current, [], current.id, '/', diff.after).url, null);
    assert.equal(baselinePagePath([removed, old], removed, diff, old.id).path, '/old');
    assert.match(baselinePagePath(catalog.releases, old, page, current.id).reason, /历史基线/);
});
test('手机改动按页面筛选并按编号定位，错误编号不匹配到其他页面', () => {
    const selected = mobilePageChanges(current, '/mobile/#/orders/demo-001', 'CHG-005');
    assert.equal(selected[0].id, 'CHG-005');
    assert.ok(!selected.some((item) => item.id === 'CHG-004'));
    assert.deepEqual(mobilePageChanges(current, '/mobile/#/unknown', 'CHG-005'), []);
    const multiple = { ...current, changes: [...current.changes, { ...selected[0], id: 'CHG-099' }] };
    assert.equal(mobilePageChanges(multiple, '/mobile/#/orders/demo-001', 'CHG-099')[0].id, 'CHG-099');
    assert.equal(resolveMobilePage('#/unknown'), null);
    assert.equal(resolveMobilePage('#/form').view, 'form');
});
test('评审链接保存版本、页面、编号、场景，手机 hash 不吞掉参数', () => {
    const url = new URL(contextPath('/releases/v0.3/', '/mobile/#/orders/demo-001', 'v0.3', 'CHG-005', 'failure'), 'https://example.test');
    assert.equal(url.hash, '#/orders/demo-001'); assert.equal(url.searchParams.get('scenario'), 'failure');
    assert.equal(url.searchParams.get('version'), 'v0.3'); assert.equal(url.searchParams.get('change'), 'CHG-005');
});
test('导入校验拒绝畸形文件和篡改定稿说明，JSON 字段顺序不影响定稿检查', () => {
    for (const value of [null, [], { releases: [null] }, { releases: [{ id: 'x', changes: [null] }] }]) assert.ok(validateCatalog(value).length);
    const changed = structuredClone(catalog); changed.releases.find((item) => item.id === old.id).goal = '篡改';
    assert.throws(() => parseCatalog(changed, catalog), /已定稿/);
    const reordered = JSON.parse(JSON.stringify(catalog)); const frozen = reordered.releases.find((item) => item.id === old.id);
    reordered.releases[reordered.releases.indexOf(frozen)] = Object.fromEntries(Object.entries(frozen).reverse());
    assert.deepEqual(immutableErrors(catalog, reordered), []);
});

test('导入改动必须登记稳定页面身份和明确的前后地址', () => {
    const data = structuredClone(catalog);
    delete data.releases[0].changes[0].pageId;
    delete data.releases[0].changes[0].previousPage;
    const errors = validateCatalog(data).join('\n');
    assert.match(errors, /页面编号/); assert.match(errors, /修改前页面地址/);
});
