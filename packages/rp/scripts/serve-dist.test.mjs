import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
test('静态部署：管理端、手机端、历史入口正确回退，缺失归档和资源不冒充当前版本', async () => {
    const root = await mkdtemp(join(tmpdir(), 'prototype-test-'));
    const reserve = createServer(); await new Promise((resolve) => reserve.listen(0, '127.0.0.1', resolve));
    const port = reserve.address().port; await new Promise((resolve) => reserve.close(resolve));
    for (const [path, value] of Object.entries({ 'index.html': 'manage', 'mobile/index.html': 'mobile', 'releases/v0.1/index.html': 'old', 'releases/v0.1/mobile/index.html': 'old-mobile', 'releases/index.json': '[]', 'versions/v0.8/index.html': 'new-manage', 'versions/v0.8/rp/index.html': 'portal', 'versions/v0.2/rp/index.html': 'portal', 'versions/v0.8/mobile/index.html': 'new-mobile', 'versions/v0.8/assets/page.js': 'version-resource' })) {
        await mkdir(join(root, path, '..'), { recursive: true }); await writeFile(join(root, path), value);
    }
    const child = spawn(process.execPath, ['scripts/serve-dist.mjs'], { env: { ...process.env, DIST_ROOT: root, PORT: String(port) }, stdio: ['ignore', 'pipe', 'pipe'] });
    try {
        await new Promise((resolve, reject) => { child.stdout.once('data', resolve); child.once('error', reject); child.once('exit', () => reject(new Error('server exited'))); });
        for (const [path, value] of Object.entries({ '/versions': 'manage', '/versions/': 'manage', '/ops-goods/orders': 'manage', '/mobile/orders': 'mobile', '/rp': 'manage', '/manage': 'manage', '/versions/v0.8/manage/orders': 'new-manage', '/versions/v0.8/rp/versions': 'portal', '/versions/v0.2/rp/versions': 'portal', '/versions/v0.8/mobile/orders': 'new-mobile', '/docs/usage': 'manage', '/prototype/help': 'manage', '/docs/missing': 'manage', '/releases/v0.1/ops-goods/orders': 'old', '/releases/v0.1/mobile/orders': 'old-mobile' })) {
            const response = await fetch(`http://127.0.0.1:${port}${path}`); assert.equal(response.status, 200); assert.equal(await response.text(), value);
        }
        for (const path of ['/versions/v9/manage', '/versions/v9/rp/versions', '/versions/v0.2/manage/orders', '/versions/v0.8/assets/missing.js', '/versions/missing', '/releases/missing', '/releases/v9/missing', '/assets/missing.js', '/mobile/assets/missing.js', '/releases/v0.1/assets/missing.js']) assert.equal((await fetch(`http://127.0.0.1:${port}${path}`)).status, 404, path);
        assert.equal((await fetch(`http://127.0.0.1:${port}/releases/index.json`)).headers.get('cache-control'), 'no-cache');
        assert.equal((await fetch(`http://127.0.0.1:${port}/%E0%A4%A`)).status, 400);
    } finally { child.kill(); await rm(root, { recursive: true, force: true }); }
});
