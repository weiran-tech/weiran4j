import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { collectDeploymentFiles, deploymentHost, deploymentId } from './deployment-files.mjs';
test('只读取静态资源，跳过服务端启动器', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'deploy-test-'));
    try {
        await writeFile(join(dir, 'index.html'), '<h1>demo</h1>');
        await writeFile(join(dir, 'serve.mjs'), 'private server');
        const files = await collectDeploymentFiles(dir);
        assert.deepEqual(files.map(item => item.file), ['index.html']);
        assert.equal(files[0].content.toString(), '<h1>demo</h1>');
    } finally { await rm(dir, { recursive: true, force: true }); }
});
for (const name of ['.env', 'config.yml', 'source.ts']) test(`拒绝发布 ${name}`, async () => {
    const dir = await mkdtemp(join(tmpdir(), 'deploy-test-'));
    try { await writeFile(join(dir, name), 'private'); await assert.rejects(collectDeploymentFiles(dir), /拒绝发布|不是允许/); }
    finally { await rm(dir, { recursive: true, force: true }); }
});
test('拒绝通过符号链接上传目录外的文件', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'deploy-test-'));
    try { await symlink('/etc/hosts', join(dir, 'leak.txt')); await assert.rejects(collectDeploymentFiles(dir), /符号链接/); }
    finally { await rm(dir, { recursive: true, force: true }); }
});
test('部署元数据不能注入 Actions 输出、请求路径或其他域名', () => {
    assert.equal(deploymentHost('rp-demo-123.vercel.app'), 'rp-demo-123.vercel.app');
    assert.equal(deploymentId('dpl_ABC123'), 'dpl_ABC123');
    for (const value of ['evil.test', 'rp.vercel.app\nnew=value', 'rp.vercel.app/path', 'rp.vercel.app@evil.test']) assert.throws(() => deploymentHost(value));
    for (const value of ['../secret', 'dpl_123?teamId=other', 'dpl_a\n']) assert.throws(() => deploymentId(value));
});
