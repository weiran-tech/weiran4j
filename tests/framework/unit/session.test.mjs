import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { saveSession, checkSession, loadSession, clearSession, readCredentials, recoverSessions, sessionRequest, principalFromState } from '../session.mjs';
import { mockCookieFetch, storageState, TOKEN_VALUE } from './cookie-fixture.mjs';

const addresses = { apiBaseURL: 'http://localhost:1', webBaseURL: 'http://localhost:2' };
async function fixture(run) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-session-'));
    const previousFetch = globalThis.fetch;
    const env = Object.fromEntries(['FLOW_ADMIN_PASSWORD','FLOW_ADMIN_PASSWORD_FILE','FLOW_ADMIN_USERNAME'].map((key) => [key, process.env[key]]));
    for (const key of Object.keys(env)) delete process.env[key];
    fs.mkdirSync(path.join(root, '.local'));
    fs.writeFileSync(path.join(root, '.local/admin.json'), JSON.stringify({ username: 'admin', password: 'synthetic-password' }), { mode: 0o600 });
    const { state, fetcher } = mockCookieFetch(); globalThis.fetch = fetcher;
    try { await run(root, state); }
    finally {
        globalThis.fetch = previousFetch;
        for (const [key,value] of Object.entries(env)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('Cookie 会话保存、远端核验和本地清理；普通登出不宣称吊销旧 JWT', () => fixture(async (root, state) => {
    await saveSession(root, 'local', 'admin', addresses);
    const value = await checkSession(root, 'local', 'admin', addresses);
    assert.equal(value.principal.id, '1'); assert.equal(value.session.version, 2);
    assert.equal(fs.statSync(value.file).mode & 0o777, 0o600);
    assert.equal(value.session.storageState.cookies.find((item) => item.name === 'weiran_token').httpOnly, true);
    assert.deepEqual(value.session.storageState.origins, []);
    const old = structuredClone(value.principal);
    await assert.rejects(saveSession(root, 'local', 'admin', addresses), /已存在/);
    await clearSession(root, 'local', 'admin', addresses);
    assert.equal(fs.existsSync(value.file), false);
    assert.equal((await sessionRequest(addresses.apiBaseURL, '/api-backend/system/auth/getCurrentUser', { principal: old })).status, 200);
    assert.ok(state.calls.some((call) => call.route.endsWith('/logout') && call.csrf === '1.synthetic-csrf'));
    assert.equal(state.calls.at(-2).cookie, null);
}));

test('环境/角色/地址/hostname 与过期缓存在请求前拒绝；远端失效或主体不符不能复用', () => fixture(async (root, state) => {
    await saveSession(root, 'local', 'admin', addresses);
    const value = loadSession(root, 'local', 'admin', addresses), count = state.calls.length;
    assert.throws(() => loadSession(root, 'local', 'admin', { ...addresses, apiBaseURL: 'http://localhost:3' }), /不匹配/);
    assert.throws(() => loadSession(root, 'local', 'admin', { ...addresses, apiBaseURL: 'http://127.0.0.1:1' }), /hostname/);
    assert.throws(() => loadSession(root, 'other', 'admin', addresses), /缺失/);
    fs.copyFileSync(value.file, path.join(root, '.local/sessions/local/viewer.json'));
    assert.throws(() => loadSession(root, 'local', 'viewer', addresses), /不匹配/);
    assert.equal(state.calls.length, count);
    state.wrongIdentity = true; await assert.rejects(checkSession(root, 'local', 'admin', addresses), /身份不一致/);
    state.wrongIdentity = false; state.expired = true; await assert.rejects(checkSession(root, 'local', 'admin', addresses), /失效/);
    const cache = JSON.parse(fs.readFileSync(value.file)); cache.expiresAt = '2000-01-01T00:00:00Z';
    fs.writeFileSync(value.file, JSON.stringify(cache));
    assert.throws(() => loadSession(root, 'local', 'admin', addresses), /过期/);
    await clearSession(root, 'local', 'admin', addresses);
}));

test('其他角色不能使用 admin 凭据，权限过宽文件拒绝；路径链接不能逃逸', () => fixture(async (root, state) => {
    process.env.FLOW_ADMIN_PASSWORD_FILE = path.join(root, '.local/admin.json');
    assert.throws(() => readCredentials(root, 'viewer'), /未配置/);
    fs.chmodSync(process.env.FLOW_ADMIN_PASSWORD_FILE, 0o644);
    assert.throws(() => readCredentials(root, 'admin'), /未配置/);
    assert.throws(() => loadSession(root, '../escape', 'admin', addresses), /无效/);
    fs.symlinkSync(os.tmpdir(), path.join(root, '.local/sessions'));
    const count = state.calls.length;
    await assert.rejects(saveSession(root, 'local', 'admin', addresses), /链接越界/);
    assert.equal(state.calls.length, count);
}));

test('核验和清理同时失败保留私有恢复材料，服务恢复后可幂等清理且错误不含 Cookie', () => fixture(async (root, state) => {
    state.failIdentity = state.failCleanup = true;
    let failed;
    try { await saveSession(root, 'local', 'admin', addresses); } catch (error) { failed = error; }
    assert.equal(failed.code, 'CLEANUP');
    assert.deepEqual(failed.failures.map((item) => item.kind), ['ENVIRONMENT','CLEANUP']);
    assert.ok(!JSON.stringify(failed).includes(TOKEN_VALUE));
    const recovery = path.join(root, '.local/sessions/local/admin.recovery');
    assert.equal(fs.readdirSync(recovery).length, 1);
    assert.equal(fs.statSync(path.join(recovery, fs.readdirSync(recovery)[0])).mode & 0o777, 0o600);
    await assert.rejects(checkSession(root, 'local', 'admin', addresses), /只能清理/);
    await assert.rejects(recoverSessions(root, 'local', 'admin', { ...addresses, apiBaseURL: 'http://localhost:3' }), /不匹配/);
    state.failIdentity = state.failCleanup = false;
    assert.deepEqual(await recoverSessions(root, 'local', 'admin', addresses), { recovered: 1 });
    assert.equal(fs.readdirSync(recovery).length, 0);
    assert.deepEqual(await recoverSessions(root, 'local', 'admin', addresses), { recovered: 0 });
}));

test('CSRF 取自同一 Cookie jar，缺少时拒绝；Cookie 属性/主体不合法拒绝', () => fixture(async () => {
    const principal = principalFromState(storageState(), addresses);
    assert.equal((await sessionRequest(addresses.apiBaseURL, '/api-backend/system/auth/logout', { principal, method: 'POST', csrf: false })).payload.code, 100103);
    const changed = storageState(); changed.cookies[0].httpOnly = false;
    assert.throws(() => principalFromState(changed, addresses), /属性/);
    const other = storageState('example.com'); assert.throws(() => principalFromState(other, addresses), /属性/);
    const duplicate = storageState(); duplicate.cookies.push(duplicate.cookies[0]); assert.throws(() => principalFromState(duplicate, addresses), /唯一/);
    const expired = storageState(); expired.cookies[0].expires = 1; assert.throws(() => principalFromState(expired, addresses), /过期/);
}));

test('成功状态但没有清 Cookie 仍属清理失败，不删除恢复记录', () => fixture(async (root, state) => {
    await saveSession(root, 'local', 'admin', addresses); state.clearCookies = false;
    await assert.rejects(clearSession(root, 'local', 'admin', addresses), /清理未完成/);
    assert.ok(fs.existsSync(loadSession(root, 'local', 'admin', addresses).file));
}));
