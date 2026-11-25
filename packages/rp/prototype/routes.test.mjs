import { test } from 'node:test';
import assert from 'node:assert/strict';
import { globalPath, namespacePath, portalEntryPath, versionBase, versionEntryPath, versionPath, pathVersion } from './routes.mjs';
import { previewTarget } from './model.mjs';
test('入口分别使用 rp、manage、mobile，旧链接保留参数及 hash', () => {
    assert.equal(namespacePath('/prototype/versions?version=v0.2#CHG-001'), '/rp/versions?version=v0.2#CHG-001');
    assert.equal(namespacePath('/prototype/manage'), '/manage');
    assert.equal(namespacePath('/system/users'), '/manage/system/users');
    assert.equal(namespacePath('/mobile/#/orders'), '/mobile/#/orders');
    assert.equal(versionEntryPath('/system/users?embed=page', 'v0.8'), '/versions/v0.8/manage/system/users?embed=page');
    assert.equal(versionEntryPath('/mobile/?scenario=failure#/orders', 'v0.8'), '/versions/v0.8/mobile/?scenario=failure#/orders');
    assert.equal(versionEntryPath('/rp/versions', 'v0.8'), '/versions/v0.8/rp/versions');
    assert.throws(() => versionBase('../other'));
});
test('当前原型进入独立版本路径，历史缺失不借用当前构建，候选保留自己的地址', () => {
    const release = { id: 'v0.8' };
    assert.match(previewTarget(release, [], 'v0.8', '/', '/manage/orders').url, /^\/versions\/v0.8\/manage\/orders\?/);
    assert.equal(previewTarget({ id: 'v0.7' }, [], 'v0.8', '/', '/manage/orders').url, null);
    const base = '/releases/v0.8-rc-abc/';
    const snapshot = { version: 'v0.8-rc-abc', prototypeVersion: 'v0.8', kind: 'candidate', base };
    assert.ok(previewTarget(release, [snapshot], 'v0.8', base, '/manage/orders').url.startsWith(base));
});
test('路径是版本唯一来源，兼容旧参数并保留范围、场景及 hash', () => {
    assert.equal(versionEntryPath('/rp?version=v0.2&scope=all#review', 'v0.8'), null);
    assert.equal(globalPath('/rp?version=v0.2&scope=all#review'), '/');
    assert.equal(portalEntryPath('/rp?scope=all', '/versions/v0.8/'), '/');
    assert.equal(portalEntryPath('/rp/help/review?version=v0.8&scope=all#评审', '/versions/v0.8/'), '/help/review#%E8%AF%84%E5%AE%A1');
    assert.equal(portalEntryPath('/rp', '/releases/v0.8-rc-fixed/'), null);
    assert.equal(portalEntryPath('/rp/versions?scope=all&version=v0.1', '/versions/v0.8/'), '/versions/v0.8/rp/versions?scope=all');
    assert.equal(portalEntryPath('/rp/versions?compare=1&change=CHG-001#review', '/versions/v0.8/'), null);
    assert.equal(portalEntryPath('/rp/mobile?version=v0.2', '/versions/v0.8/'), '/versions/v0.8/rp/mobile');
    assert.equal(portalEntryPath('/prototype/workflow?version=v0.2', '/versions/v0.8/'), '/versions/v0.8/rp/workflow');
    assert.equal(portalEntryPath('/manage/refund-demo?version=v0.1', '/versions/v0.8/'), '/versions/v0.8/manage/refund-demo');
    assert.equal(portalEntryPath('/rp/versions?version=v0.1', '/'), null);
    assert.equal(portalEntryPath('/rp/versions?version=v0.1', '/releases/v0.8-rc-fixed/'), null);
    assert.equal(versionPath('/rp?version=v0.8&scope=all', 'v0.2'), '/versions/v0.2/rp?scope=all');
    assert.equal(pathVersion('/versions/v0.2/rp'), 'v0.2');
    assert.ok(!previewTarget({ id: 'v0.8' }, [], 'v0.8', '/versions/v0.2/', '/manage/orders').url.includes('version='));
    assert.ok(previewTarget({ id: 'v0.8' }, [], 'v0.8', '/versions/v0.2/', '/manage/orders').url.startsWith('/versions/v0.8/'));
});

test('主入口和帮助文档使用全局路径，兼容旧入口且不携带版本', () => {
    assert.equal(globalPath('/?version=v0.2&scope=all'), '/');
    assert.equal(globalPath('/help/review?scope=all&version=v0.2#标注'), '/help/review#%E6%A0%87%E6%B3%A8');
    assert.equal(globalPath('/rp/help/review'), '/help/review');
    assert.equal(portalEntryPath('/help/product', '/versions/v0.8/'), '/help/product');
    assert.equal(versionEntryPath('/help/product', 'v0.8'), null);
});

test('版本清单为全局页面，不携带版本上下文', () => {
    assert.equal(globalPath('/versions?version=v0.2&scope=all'), '/versions');
    assert.equal(portalEntryPath('/versions', '/versions/v0.8/'), '/versions');
    assert.equal(versionEntryPath('/versions', 'v0.8'), null);
});
