import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { withApiSession } from '../support/api/session.mjs';
import { ResourceLedger, recoverResources, ledgerPath } from '../support/api/resources.mjs';
import { userBody, roleBody } from '../support/api/data.mjs';
import { recoverSessions } from '../framework/session.mjs';
import { createApiModel } from '../synthetic/model.mjs';

async function fixture(operation) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran-api-tools-')), model = createApiModel();
    const old = globalThis.fetch, names = ['FLOW_ALLOW_WRITE', 'FLOW_ADMIN_USERNAME', 'FLOW_ADMIN_PASSWORD', 'FLOW_ADMIN_PASSWORD_FILE', 'TEST_SESSION_ROLE'];
    const previous = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    globalThis.fetch = model.fetcher; process.env.FLOW_ALLOW_WRITE = 'true'; process.env.FLOW_ADMIN_USERNAME = 'api_admin';
    process.env.FLOW_ADMIN_PASSWORD = 'synthetic-admin-password'; delete process.env.TEST_SESSION_ROLE; delete process.env.FLOW_ADMIN_PASSWORD_FILE;
    const options = { root, writes: true, environment: 'local', addresses: { apiBaseURL: 'http://localhost:1', webBaseURL: 'http://localhost:1' } };
    try { await operation({ root, model, options, session: (fn) => withApiSession(options, fn) }); }
    finally {
        globalThis.fetch = old;
        for (const name of names) { if (previous[name] === undefined) delete process.env[name]; else process.env[name] = previous[name]; }
        fs.rmSync(root, { recursive: true, force: true });
    }
}

test('缺少写开关/false在任何登录或业务写入之前拒绝；缺凭据不采用种子密码', () => fixture(async ({ model, session }) => {
    for (const value of [undefined, 'false', 'TRUE', '1']) {
        if (value === undefined) delete process.env.FLOW_ALLOW_WRITE; else process.env.FLOW_ALLOW_WRITE = value;
        await assert.rejects(session(() => {}), /ALLOW_WRITE/);
    }
    assert.equal(model.calls.length, 0);
    process.env.FLOW_ALLOW_WRITE = 'true'; delete process.env.FLOW_ADMIN_PASSWORD;
    await assert.rejects(session(() => {}), /未配置/); assert.equal(model.calls.length, 0);
}));
test('创建响应丢失后按写前唯一意图恢复，不重发创建，0600清单无密码Cookie', () => fixture(async ({ root, model, session }) => {
    let runId, file;
    await session(async (api) => {
        const ledger = new ResourceLedger(api); runId = ledger.value.runId; file = ledger.file;
        const body = userBody(ledger.key('u')); model.fault.dropCreate = true;
        await assert.rejects(ledger.create('user', body.username, body), /连接/);
        assert.equal(fs.statSync(file).mode & 0o777, 0o600);
        const text = fs.readFileSync(file, 'utf8'); assert.ok(!text.includes(body.password) && !text.includes('weiran_token') && !text.includes('synthetic-admin-password'));
        assert.equal(JSON.parse(text).resources[0].id, null);
        assert.equal(model.db.user.length, 2);
    });
    await session(async (api) => {
        assert.deepEqual(await recoverResources(api, runId), { recovered: true });
        assert.deepEqual(await recoverResources(api, runId), { recovered: false });
    });
    assert.equal(model.db.user.length, 1); assert.equal(fs.existsSync(file), false);
    assert.equal(model.calls.filter((call) => call.route.endsWith('/user/create')).length, 1);
}));
test('删除失败保留清单；服务恢复后只清理自己的资源，已有数据保持', () => fixture(async ({ model, session }) => {
    let runId, file;
    await session(async (api) => {
        const ledger = new ResourceLedger(api); runId = ledger.value.runId; file = ledger.file;
        const key = ledger.key('r'); await ledger.create('role', key, roleBody(key));
        model.fault.failDelete = true;
        await assert.rejects(ledger.cleanup(), /保留私有清单/); assert.ok(fs.existsSync(file));
    });
    model.fault.failDelete = false;
    await session((api) => recoverResources(api, runId));
    assert.equal(model.db.role.length, 0); assert.equal(model.db.user.length, 1); assert.equal(model.db.menu.length, 1);
}));
test('恢复拒绝错误环境/地址/主体/ID/类型/父级/宽权限，材料不删除且无DELETE', () => fixture(async ({ model, session }) => {
    await session(async (api) => {
        const ledger = new ResourceLedger(api), key = ledger.key('r'); await ledger.create('role', key, roleBody(key));
        const original = fs.readFileSync(ledger.file, 'utf8'), deletes = () => model.calls.filter((call) => call.method === 'DELETE').length;
        for (const mutation of [
            (v) => { v.environment = 'other'; }, (v) => { v.apiBaseURL = 'http://localhost:2'; },
            (v) => { v.actorId = '999'; }, (v) => { v.resources[0].key = 'super_admin'; },
            (v) => { v.resources[0].id = '1'; }, (v) => { v.resources[0].type = 'arbitrary-url'; },
            (v) => { v.resources[0].parent = '999'; },
        ]) {
            const value = JSON.parse(original); mutation(value); fs.writeFileSync(ledger.file, JSON.stringify(value));
            const before = deletes(); await assert.rejects(recoverResources(api, ledger.value.runId));
            assert.equal(deletes(), before); assert.ok(fs.existsSync(ledger.file));
        }
        fs.writeFileSync(ledger.file, original); fs.chmodSync(ledger.file, 0o644);
        await assert.rejects(recoverResources(api, ledger.value.runId), /0600/);
        fs.chmodSync(ledger.file, 0o600); await ledger.cleanup();
    });
}));
test('私有路径链接越界/无效runId在请求前拒绝，损坏JSON保留', () => fixture(async ({ root, model, session, options }) => {
    assert.throws(() => ledgerPath(root, '../escape', 'a'.repeat(24)), /无效/);
    assert.throws(() => ledgerPath(root, 'local', '../../escape'), /无效/);
    fs.mkdirSync(path.join(root, '.local'), { recursive: true }); fs.symlinkSync(os.tmpdir(), path.join(root, '.local/api-resources'));
    const before = model.calls.length;
    assert.throws(() => ledgerPath(root, 'local', 'a'.repeat(24)), /越界/); assert.equal(model.calls.length, before);
    fs.unlinkSync(path.join(root, '.local/api-resources'));
    await session(async (api) => {
        const file = ledgerPath(root, 'local', 'a'.repeat(24)); fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, 'broken', { mode: 0o600 });
        await assert.rejects(recoverResources(api, 'a'.repeat(24)), /损坏/); assert.ok(fs.existsSync(file));
        await assert.rejects(recoverResources({ ...api, scope: { ...api.scope, environment: 'other' } }, '../invalid'), /无效/);
    });
}));
test('已经清理的标记不能掩盖仍存在的数据，拒绝接管已有唯一身份', () => fixture(async ({ session, model }) => {
    await session(async (api) => {
        const ledger = new ResourceLedger(api), key = ledger.key('r'); await ledger.create('role', key, roleBody(key));
        const entry = ledger.value.resources[0]; entry.state = 'deleted'; ledger.persist();
        await assert.rejects(ledger.cleanup(), /保留私有/); assert.equal(model.db.role.length, 1);
        entry.state = 'created'; ledger.persist();
        const count = model.calls.filter((call) => call.method === 'POST').length;
        await assert.rejects(ledger.create('role', key, roleBody(key)), /身份无效/);
        assert.equal(model.calls.filter((call) => call.method === 'POST').length, count);
        await ledger.cleanup();
    });
}));

test('明确创建拒绝不接管竞争记录；直接清理清单外资源也拒绝', () => fixture(async ({ session, model }) => {
    await session(async (api) => {
        const ledger = new ResourceLedger(api), key = ledger.key('r');
        const original = api.request;
        api.request = async (route, method, data) => {
            if (route.endsWith('/role/create')) {
                model.db.role.push({ ...roleBody(key), id: 888, isBuiltin: false, menuIds: [], version: 0 });
                return { status: 409, payload: { code: 100003, data: null } };
            }
            return original(route, method, data);
        };
        await assert.rejects(ledger.create('role', key, roleBody(key)), /成功状态/);
        assert.equal(ledger.value.resources.length, 0);
        const count = model.calls.filter((call) => call.method === 'DELETE').length;
        await assert.rejects(ledger.remove({ type: 'role', key, id: '888', parent: null, state: 'created' }), /清单外/);
        await ledger.cleanup();
        assert.equal(model.calls.filter((call) => call.method === 'DELETE').length, count); assert.equal(model.db.role.length, 1);
    });
}));

test('业务与会话清理同时失败保留两类材料，并保留可恢复资源编号', () => fixture(async ({ session, model, root, options }) => {
    let runId;
    let failure;
    try {
        await session(async (api) => {
            const ledger = new ResourceLedger(api); runId = ledger.value.runId;
            const key = ledger.key('r'); await ledger.create('role', key, roleBody(key));
            model.fault.failDelete = model.fault.failLogout = true;
            await ledger.cleanup();
        });
    } catch (error) { failure = error; }
    assert.match(failure.message, /均失败/); assert.ok(failure.message.includes(runId));
    assert.ok(!failure.message.includes('synthetic-admin-password'));
    assert.ok(fs.existsSync(ledgerPath(root, 'local', runId)));
    assert.ok(fs.readdirSync(path.join(root, '.local/sessions/local/api-admin.recovery')).length > 0);
    model.fault.failDelete = model.fault.failLogout = false;
    await session((api) => recoverResources(api, runId));
    await recoverSessions(root, 'local', 'api-admin', options.addresses);
    assert.equal(fs.readdirSync(path.join(root, '.local/sessions/local/api-admin.recovery')).length, 0);
    assert.equal(model.db.role.length, 0);
}));

test('API地址不兼容、含凭据或非法环境在登录与读取凭据前拒绝', () => fixture(async ({ options, model }) => {
    for (const changed of [
        { addresses: { ...options.addresses, webBaseURL: 'http://other.invalid:2' } },
        { addresses: { ...options.addresses, apiBaseURL: 'http://user:sentinel@localhost:1' } },
        { environment: '../escape' }, { role: '../admin' },
    ]) {
        await assert.rejects(withApiSession({ ...options, ...changed }, () => {}), /环境、角色或地址无效/);
    }
    assert.equal(model.calls.length, 0);
}));
