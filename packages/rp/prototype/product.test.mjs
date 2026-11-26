import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeProduct, validateCatalog } from './model.mjs';
import catalog from './history/releases-before-source-workflow.json' with { type: 'json' };
import baselines from './page-baselines.json' with { type: 'json' };
const change = (id, type, before, after) => ({ id: `CHG-${id}`, type, platform: 'manage', pageId: id, pageTitle: id, page: after || before, previousPage: before, nextPage: after });
test('完整清单继承未改动页面，覆盖修改、增加新增并排除删除，不污染基线', () => {
    const seed = { v1: { pages: ['keep', 'edit', 'remove'].map((id) => ({ platform: 'manage', pageId: id, title: id, path: `/manage/${id}`, group: '订单' })) } };
    const releases = [{ id: 'v1', baseline: null, changes: [] }, { id: 'v2', baseline: 'v1', changes: [change('edit', 'modify', '/manage/edit', '/manage/edited'), change('new', 'add', null, '/manage/new'), change('remove', 'remove', '/manage/remove', null)] }, { id: 'v3', baseline: 'v2', changes: [] }];
    const initial = JSON.stringify(seed);
    const pages = completeProduct(releases, 'v2', seed).pages;
    assert.deepEqual(pages.map((p) => p.path).sort(), ['/manage/edited', '/manage/keep', '/manage/new']);
    assert.equal(pages.find((p) => p.pageId === 'keep').changedIn, 'v1');
    assert.equal(pages.find((p) => p.pageId === 'edit').changedIn, 'v2');
    assert.deepEqual(completeProduct(releases, 'v3', seed).pages, pages);
    assert.equal(JSON.stringify(seed), initial);
});
test('真实当前版本完整清单保留基线业务页，路径迁移不重复页面', () => {
    const product = completeProduct(catalog.releases, catalog.current, baselines);
    assert.equal(product.complete, true);
    assert.ok(product.pages.some((page) => page.path === '/manage/biz/accounts' && page.changedIn === 'v0.2'));
    assert.equal(product.pages.filter((page) => page.path === '/manage/refund-demo').length, 1);
    assert.ok(product.pages.some((page) => page.pageId === 'mobile-orders'));
    assert.ok(product.pages.every((page) => !page.path.startsWith('/prototype')));
});
test('没有固定清单时明确缺失，循环基线不能生成产品', () => {
    assert.equal(completeProduct(catalog.releases, 'v0.1', baselines).complete, false);
    assert.equal(completeProduct(catalog.releases, 'missing', baselines).complete, false);
    assert.throws(() => completeProduct([{ id: 'v1', baseline: 'v2', changes: [] }, { id: 'v2', baseline: 'v1', changes: [] }], 'v1'), /循环/);
});
test('无页面改动版本允许评审，但必须声明基线', () => {
    const release = { ...catalog.releases[0], id: 'v0.9', changes: [], baseline: 'v0.2' };
    const data = { current: release.id, releases: [release, ...catalog.releases] };
    assert.deepEqual(validateCatalog(data), []);
    release.baseline = null;
    assert.ok(validateCatalog(data).some((error) => error.includes('无页面改动时必须指定')));
});

test('相同基线的兄弟版本不自动混入完整产品', () => {
    const seed = { v1: { pages: [{ platform: 'manage', pageId: 'a', title: '原页面', path: '/a', group: '模块' }] } };
    const change = (title, path) => ({ id: 'CHG-001', type: 'modify', platform: 'manage', pageId: 'a', pageTitle: title, previousPage: '/a', nextPage: path, page: path });
    const versions = [{ id: 'v1', baseline: null, changes: [] }, { id: 'v2', baseline: 'v1', changes: [change('本版页面', '/v2-a')] }, { id: 'v9', baseline: 'v1', changes: [change('其他新版页面', '/v9-a')] }];
    assert.equal(completeProduct(versions, 'v2', seed).pages[0].path, '/v2-a');
    assert.equal(completeProduct(versions, 'v1', seed).pages[0].path, '/a');
});
