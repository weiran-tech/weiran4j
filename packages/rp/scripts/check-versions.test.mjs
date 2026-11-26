import { test } from 'node:test';
import assert from 'node:assert/strict';
import catalog from '../prototype/history/releases-before-source-workflow.json' with { type: 'json' };
import { immutableErrors, validateCatalog } from './check-versions.mjs';
test('共享说明完整、链接有效、基线没有循环', () => assert.deepEqual(validateCatalog(catalog), []));
test('缺少验收、重复编号、越站路径和循环基线被拒绝', () => {
    const data = structuredClone(catalog);
    const release = data.releases[0];
    release.changes[0].acceptance = [];
    release.changes[1].id = release.changes[0].id;
    release.changes[0].page = '//example.com/';
    data.releases.find((item) => item.id === release.baseline).baseline = release.id;
    const errors = validateCatalog(data).join('\n');
    for (const message of ['验收标准', '重复', '路径', '循环']) assert.ok(errors.includes(message));
});
test('已定稿说明不能被覆盖或删除，允许追加新版本', () => {
    const old = structuredClone(catalog); old.releases[0].status = 'finalized';
    const next = structuredClone(old); next.releases[0].goal = '偷偷修改';
    assert.equal(immutableErrors(old, next).length, 1);
    assert.deepEqual(immutableErrors(old, structuredClone(old)), []);
    assert.equal(immutableErrors(old, { releases: [] }).length, old.releases.filter((item) => item.status === 'finalized' || item.supersededBy).length);
});

test('评审前必须填写模板占位内容', () => {
    const data = structuredClone(catalog);
    data.releases[0].goal = '请填写版本目标';
    assert.ok(validateCatalog(data).some((error) => error.includes('占位')));
    data.releases[0].status = 'draft';
    assert.deepEqual(validateCatalog(data), []);
});

test('被承接的未定稿说明同样只读，但历史保留', () => {
    const old = structuredClone(catalog); const retired = old.releases.find((item) => item.supersededBy);
    const next = structuredClone(old); next.releases.find((item) => item.id === retired.id).goal = '改写旧记录';
    assert.ok(immutableErrors(old, next).some((text) => text.includes('已承接')));
});

test('固定基线不能指向尚未定版的工作版本，同基线兄弟版本保持隔离', () => {
    const data = structuredClone(catalog);
    data.releases[0].baseline = 'v0.7';
    assert.ok(validateCatalog(data).some((error) => error.includes('固定基线')));
});
