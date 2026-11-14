import test from 'node:test';
import assert from 'node:assert/strict';
import { readAccessBoundary } from '../support/steps/system/access-boundary.ts';
import { readCore, readRegions } from '../support/steps/api/read.ts';
import { scenario } from '../synthetic/harness.mjs';
import { page, tree } from '../support/api/protocol.mjs';

test('核心 API：真实步骤验证分页归一化、空数据、列表详情与地区数组/树', async () => {
    const read = await scenario(readCore, { writes: false }); assert.equal(read.pagedResources, 6);
    const region = await scenario(readRegions, { writes: false }); assert.equal(region.listIsArray, true);
    assert.deepEqual(page({ list: [], total: 0, page: 1, pageSize: 2 }), []);
    assert.deepEqual(tree([]), []);
});
test('读取失败不能变成空数据：字符串code、缺total、非法父子树均拒绝', async () => {
    await assert.rejects(scenario(readCore, { writes: false, fault: { missingTotal: true } }), /分页/);
    await assert.rejects(scenario(readCore, { writes: false, fault: { badCode: true } }), /code/);
    await assert.rejects(scenario(readCore, { writes: false, fault: { badTree: true } }), /树/);
    await assert.rejects(scenario(readCore, { writes: false, setup: (model) => { delete model.db.user[0].nickname; } }), /字段/);
    assert.throws(() => page({ list: [], total: '0', page: 1, pageSize: 2 }), /分页/);
});

test('匿名误放行也只保留布尔证据，不把真实响应data或异常code写入附件', async () => {
    const sentinel = 'sensitive-response-sentinel';
    const observations = await readAccessBoundary({ fetch: async () => ({ status: () => 200,
        json: async () => ({ code: sentinel, data: { token: sentinel, username: sentinel } }) }) });
    assert.equal(observations.length, 10); assert.ok(observations.every((row) => row.code === null && row.dataIsNull === false));
    assert.ok(!JSON.stringify(observations).includes(sentinel));
});
