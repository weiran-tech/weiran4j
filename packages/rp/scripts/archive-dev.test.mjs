import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { archiveDevMiddleware } from './archive-dev.mjs';
test('开发预览使用真实归档索引，手机与管理端各自回退，缺失资源返回 404', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prototype-dev-'));
    const metadata = { version: 'v0.2', base: '/releases/v0.2/', commit: 'a'.repeat(40), builtAt: '2026-11-23' };
    for (const [path, value] of Object.entries({ 'v0.2/prototype-build.json': JSON.stringify(metadata), 'v0.2/index.html': 'old-manage', 'v0.2/mobile/index.html': 'old-mobile' })) {
        await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), value);
    }
    const handler = archiveDevMiddleware(root);
    const server = createServer((req, res) => handler(req, res, () => { res.statusCode = 418; res.end('next'); }));
    await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
    const origin = `http://127.0.0.1:${server.address().port}`;
    try {
        assert.deepEqual(await (await fetch(origin + '/releases/index.json')).json(), [metadata]);
        assert.equal(await (await fetch(origin + '/releases/v0.2/prototype/refund')).text(), 'old-manage');
        assert.equal(await (await fetch(origin + '/releases/v0.2/mobile/orders')).text(), 'old-mobile');
        for (const path of ['/releases/v0.2/assets/missing.js', '/releases/v9/page']) assert.equal((await fetch(origin + path)).status, 404);
        assert.equal((await fetch(origin + '/prototype/versions')).status, 418);
    } finally { await new Promise((resolve) => server.close(resolve)); await rm(root, { recursive: true, force: true }); }
});
