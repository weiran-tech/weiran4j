import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { checkAdminSession } from '../support/steps/system/admin-session.ts';
import { mockCookieFetch, TOKEN_VALUE } from '../framework/unit/cookie-fixture.mjs';

async function scenario(failSnapshot = false, failCleanup = false, failLoginJson = false) {
    const previousFetch = globalThis.fetch, previousPassword = process.env.FLOW_ADMIN_PASSWORD, previousUsername = process.env.FLOW_ADMIN_USERNAME;
    process.env.FLOW_ADMIN_PASSWORD = 'synthetic-password'; process.env.FLOW_ADMIN_USERNAME = 'admin';
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-admin-unit-'));
    const evidence = [], { state, fetcher } = mockCookieFetch(); state.failSnapshot = failSnapshot; state.failCleanup = failCleanup;
    globalThis.fetch = async (url, options) => {
        const response = await fetcher(url, options);
        return failLoginJson && new URL(url).pathname.endsWith('/login') ? new Response('invalid-json', { headers: response.headers }) : response;
    };
    let error, recoveryCount = 0;
    try { await checkAdminSession('http://localhost:1', async (name, value) => { evidence.push({ name, value }); }, root); }
    catch (caught) { error = caught; }
    finally {
        const recovery = path.join(root, '.local/sessions/local/admin.recovery');
        recoveryCount = fs.existsSync(recovery) ? fs.readdirSync(recovery).length : 0;
        fs.rmSync(root, { recursive: true, force: true }); globalThis.fetch = previousFetch;
        if (previousPassword === undefined) delete process.env.FLOW_ADMIN_PASSWORD; else process.env.FLOW_ADMIN_PASSWORD = previousPassword;
        if (previousUsername === undefined) delete process.env.FLOW_ADMIN_USERNAME; else process.env.FLOW_ADMIN_USERNAME = previousUsername;
    }
    return { evidence, state, error, recoveryCount };
}
test('API 系统步骤：主体、授权快照、CSRF 与 Cookie 清理，证据无凭据', async () => {
    const result = await scenario(); assert.equal(result.error, undefined);
    assert.deepEqual(result.evidence.map((item) => item.name), ['before-state','after-state','cleanup-state']);
    assert.equal(result.evidence[1].value.csrfRejected, true);
    assert.equal(result.evidence.at(-1).value.sessionClosed, true);
    assert.equal(result.evidence.at(-1).value.oldJwtRevocationClaimed, false);
    assert.equal(result.recoveryCount, 0);
    for (const secret of ['synthetic-password',TOKEN_VALUE,'1.synthetic-csrf']) assert.ok(!JSON.stringify(result.evidence).includes(secret));
});
test('授权快照失败仍执行清理；清理失败不可通过并保留恢复材料', async () => {
    const failed = await scenario(true); assert.match(failed.error.message, /授权快照/);
    assert.equal(failed.evidence.at(-1).value.sessionClosed, true); assert.equal(failed.recoveryCount, 0);
    const cleanup = await scenario(false, true); assert.equal(cleanup.error.code, 'CLEANUP');
    assert.equal(cleanup.evidence.at(-1).value.recoveryRequired, true); assert.equal(cleanup.recoveryCount, 1);
    assert.ok(!JSON.stringify(cleanup.error).includes(TOKEN_VALUE));
});

test('登录响应 JSON 损坏时仍清理已经签发的 Cookie', async () => {
    const result = await scenario(false, false, true);
    assert.match(result.error.message, /JSON/);
    assert.equal(result.evidence.at(-1).value.sessionClosed, true);
    assert.ok(result.state.calls.some((call) => call.route.endsWith('/logout')));
    assert.equal(result.recoveryCount, 0);
});
