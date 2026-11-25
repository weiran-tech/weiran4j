import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStaticDeployment } from './static-deployment.mjs';
const files = [{ file: 'old.js', sha: 'old', size: 3, content: Buffer.from('old') }, { file: 'new.js', sha: 'new', size: 3, content: Buffer.from('new') }, { file: 'copy/new.js', sha: 'new', size: 3, content: Buffer.from('new') }];
const options = { headers: {}, log: () => {} };
test('缓存摘要齐全时一次创建部署，不重新上传历史资源', async () => {
    const calls = [];
    const result = await createStaticDeployment(files, { name: 'test' }, { ...options, fetchImpl: async (url, init) => { calls.push({ url, body: JSON.parse(init.body) }); return Response.json({ id: 'ready' }); } });
    assert.equal(result.id, 'ready'); assert.equal(calls.length, 1);
    assert.deepEqual(calls[0].body.files[0], { file: 'old.js', sha: 'old', size: 3 });
});
test('仅内联缺失小文件，重复路径共用摘要，保留全部历史引用', async () => {
    const calls = [];
    await createStaticDeployment(files, { name: 'test' }, { ...options, fetchImpl: async (url, init) => {
        assert.ok(url.includes('/deployments'));
        calls.push(JSON.parse(init.body));
        return calls.length === 1 ? Response.json({ error: { code: 'missing_files', missing: ['new'] } }, { status: 400 }) : Response.json({ id: 'deployment' });
    } });
    assert.equal(calls.length, 2);
    assert.deepEqual(calls[1].files[0], { file: 'old.js', sha: 'old', size: 3 });
    for (const file of calls[1].files.slice(1)) { assert.equal(file.encoding, 'base64'); assert.equal(Buffer.from(file.data, 'base64').toString(), 'new'); }
});
test('大文件只上传平台报告缺失的摘要一次', async () => {
    const uploads = []; let creates = 0;
    await createStaticDeployment(files, {}, { ...options, inlineLimit: 0, fetchImpl: async (url, init) => {
        if (url.includes('/v2/files')) { uploads.push(init.headers['x-vercel-digest']); return new Response(null, { status: 200 }); }
        return ++creates === 1 ? Response.json({ error: { code: 'missing_files', missing: [{ sha: 'new' }] } }, { status: 400 }) : Response.json({ id: 'deployment' });
    } });
    assert.deepEqual(uploads, ['new']); assert.equal(creates, 2);
});
test('限流和未知缺失资源不会报告成功或盲目重传全部文件', async () => {
    await assert.rejects(createStaticDeployment(files, {}, { ...options, fetchImpl: async () => Response.json({ error: { code: 'rate_limited' } }, { status: 429 }) }), /HTTP 429/);
    await assert.rejects(createStaticDeployment(files, {}, { ...options, fetchImpl: async () => Response.json({ error: { code: 'missing_files', missing: ['unrecognized'] } }, { status: 400 }) }), /无法识别/);
});
