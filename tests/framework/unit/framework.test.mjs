import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { removeFlow } from "../maintenance.mjs";
import { initFlow } from "../scaffold.mjs";
import { loadFlows, resolveExecution, verifyReport, captureEvidence } from "../core.mjs";
import { lintFlows, runHistory, statistics } from "../catalog.mjs";
import { loginWindow } from "../browser.mjs";
import { runParallelPages } from "../../support/helpers/parallel-pages.ts";
import { runBatch } from "../batch.mjs";

async function workspace(run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-framework-'));
    const root = path.join(repo, 'tests');
    const write = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, value); };
    const json = (file, value) => write(file, JSON.stringify(value, null, 2));
    try {
        fs.cpSync(path.resolve(import.meta.dirname, '../..'), root, { recursive: true,
            filter: (file) => !['.local', '.artifacts', 'unit'].includes(path.basename(file)) });
        fs.symlinkSync(path.resolve(import.meta.dirname, '../../../node_modules'), path.join(repo, 'node_modules'));
        for (const file of ['pnpm-lock.yaml', 'package.json']) fs.copyFileSync(path.resolve(import.meta.dirname, '../../..', file), path.join(repo, file));
        const cli = (...args) => spawnSync(process.execPath, ['tests/framework/cli.mjs', ...args], { cwd: repo, encoding: 'utf8', timeout: 30000 });
        const addNative = (id = 'weiran4j/probe', code = "expect(1).toBe(1);", expectedCases = 1) => {
            initFlow(root, id, { project: 'api' });
            const flow = loadFlows(root).find((flow) => flow.id === id);
            write(path.join(root, flow.entry), `import{test,expect}from'@playwright/test';test('offline',()=>{${code}});`);
            json(path.join(root, flow.manifest), { ...JSON.parse(fs.readFileSync(path.join(root, flow.manifest))), steps: [], inputs: [], expectedCases, evidence: { requiredAttachments: [] } });
            fs.unlinkSync(path.join(root, flow.steps[0]));
            const index = path.join(root, 'support/steps/INDEX.md');
            write(index, fs.readFileSync(index, 'utf8').split('\n').filter((line) => !line.includes('`' + id + '.ts`')).join('\n'));
            return loadFlows(root).find((flow) => flow.id === id);
        };
        await run({ repo, root, write, json, cli, addNative });
    } finally { fs.rmSync(repo, { recursive: true, force: true }); }
}

test('原生维护支持删除预览、共享步骤保留及历史保留；无来源跟踪', () => workspace(async ({ root, cli }) => {
    initFlow(root, 'weiran4j/first', { project: 'api' });
    initFlow(root, 'weiran4j/second', { project: 'api' });
    const first = loadFlows(root).find((flow) => flow.id === 'weiran4j/first');
    const second = loadFlows(root).find((flow) => flow.id === 'weiran4j/second');
    fs.writeFileSync(path.join(root, second.entry), "import{test}from'../../../support/fixtures/test';import{stepFirst}from'../../../support/steps/weiran4j/first';import{stepSecond}from'../../../support/steps/weiran4j/second';test('shared',async({backend})=>{await stepFirst(backend);await stepSecond(backend);});");
    const meta = JSON.parse(fs.readFileSync(path.join(root, second.manifest)));
    meta.steps.push(first.steps[0]); fs.writeFileSync(path.join(root, second.manifest), JSON.stringify(meta));
    const artifacts = path.join(root, '.artifacts/runs/preserved'); fs.mkdirSync(artifacts, { recursive: true });
    fs.writeFileSync(path.join(artifacts, 'evidence.json'), '{}');
    assert.equal(removeFlow(root, first.id).dryRun, true);
    assert.equal(fs.existsSync(path.join(root, first.entry)), true);
    removeFlow(root, first.id, { yes: true });
    assert.equal(fs.existsSync(path.join(root, first.entry)), false);
    assert.equal(fs.existsSync(path.join(root, first.steps[0])), true);
    assert.equal(fs.existsSync(artifacts), true);
    assert.equal(fs.existsSync(path.join(root, '.local/library.json')), false);
    assert.equal(cli('check', '--deep').status, 0);
}));

test('七条系统流程完整发现；显式阻塞仍写批次但不启动会话', () => workspace(async ({ root, cli, repo, json, addNative }) => {
    const system = loadFlows(root).filter((flow) => flow.id.startsWith('system/'));
    assert.equal(system.length, 7); assert.equal(system.reduce((n, flow) => n + flow.expectedCases, 0), 7);
    const blocked = addNative('weiran4j/blocked');
    json(path.join(root, blocked.manifest), { ...JSON.parse(fs.readFileSync(path.join(root, blocked.manifest))), tags:['blocked-fixture'], blockedReason:'合成前提缺失' });
    const result = cli('run', '--tag', 'blocked-fixture');
    assert.equal(result.status, 1);
    const batch = JSON.parse(result.stdout);
    assert.equal(batch.counts.selected, 1); assert.equal(batch.counts.blocked, 1); assert.equal(batch.counts.executed, 0);
    assert.ok(batch.items.every((item) => item.reason && item.failureKind === 'ENVIRONMENT'));
    assert.equal(fs.existsSync(batch.artifactFile), true);
    assert.equal(fs.existsSync(path.join(root, '.artifacts/runs')), false);
    assert.equal(fs.existsSync(path.join(root, '.local/sessions')), false);
    assert.equal(cli('check', '--deep').status, 0);
    const native = spawnSync(process.execPath, [path.join(repo, 'node_modules/@playwright/test/cli.js'), 'test', '--config', 'tests/playwright.config.ts'], { cwd: repo, encoding:'utf8', timeout:15000 });
    assert.equal(native.status, 1); assert.match(native.stderr + native.stdout, /统一|test:flows/);
}));

test('移除的命令与参数直接报错，无兼容分支', () => workspace(async ({ cli }) => {
    for (const command of ['add', 'sync', 'update', 'login', 'validate', 'lint']) assert.equal(cli(command).status, 1, command);
    for (const flag of ['--allow-stale', '--allow-skipped', '--allow-flaky', '--allow-degraded']) assert.equal(cli('run', 'system/health', flag).status, 1);
    assert.equal(cli('run', 'system/health', '--consumer', 'manage').status, 1);
    assert.equal(cli('run', 'system/health', '--storage-state', '/tmp/cache').status, 1);
    assert.equal(cli('list', '--project', 'weiran4j').status, 1);
    assert.equal(cli('session', 'save').status, 1);
}));

test('查询、原生执行、独立复核、历史与反馈共享严格判据', () => workspace(async ({ root, cli, addNative, write }) => {
    const flow = addNative();
    assert.equal(JSON.parse(cli('list', '--project', 'api', '--json').stdout).length, 4);
    assert.equal(JSON.parse(cli('list', '--step', 'auth/login', '--json').stdout).length, 1);
    assert.deepEqual(JSON.parse(cli('list', 'no-match', '--json').stdout), []);
    assert.equal(cli('run', flow.id).status, 0);
    const id = runHistory(root)[0].runId;
    const originalFile = path.join(root, '.artifacts/runs', id, 'verification.json');
    const original = fs.readFileSync(originalFile);
    assert.equal(cli('verify', id).status, 0);
    assert.equal(cli('feedback', flow.id, '--verdict', 'useful', '--run-id', id).status, 0);
    assert.equal(JSON.parse(cli('stats', '--json').stdout)[0].passed, 1);
    assert.equal(cli('report', id, '--dry-run').status, 0);
    assert.equal(cli('feedback', 'system/health', '--verdict', 'useful', '--run-id', id).status, 1);
    write(path.join(root, '.artifacts/runs', id, 'results.json'), '{}');
    assert.equal(cli('feedback', flow.id, '--verdict', 'useful', '--run-id', id).status, 1);
    assert.deepEqual(fs.readFileSync(originalFile), original);
    assert.equal(runHistory(root)[0].originalVerified, true);
    assert.equal(statistics(root)[0].failed, 1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, '.artifacts/runs', id, 'reverification.json'))).ok, false);
}));

test('真实批次继续执行可用项，记录阻塞/通过/失败，dry-run 不落盘', () => workspace(async ({ root, cli, addNative, json }) => {
    const blocked = addNative('weiran4j/blocked');
    json(path.join(root, blocked.manifest), { ...JSON.parse(fs.readFileSync(path.join(root, blocked.manifest))), tags:['batch-fixture'], blockedReason:'合成前提缺失' });
    const passed = addNative('weiran4j/passed');
    const failed = addNative('weiran4j/failed', 'expect(1).toBe(2);');
    for (const flow of [passed, failed]) json(path.join(root, flow.manifest), { ...JSON.parse(fs.readFileSync(path.join(root, flow.manifest))), tags: ['batch-fixture'] });
    assert.equal(cli('run', '--tag', 'batch-fixture', '--dry-run').status, 1);
    assert.equal(fs.existsSync(path.join(root, '.artifacts')), false);
    assert.equal(cli('run', '--tag', 'batch-fixture').status, 1);
    const directory = path.join(root, '.artifacts/batches');
    const batch = JSON.parse(fs.readFileSync(path.join(directory, fs.readdirSync(directory)[0], 'batch.json')));
    assert.equal(batch.counts.selected, 3); assert.equal(batch.counts.blocked, 1);
    assert.equal(batch.counts.executed, 2); assert.equal(batch.counts.passed, 1); assert.equal(batch.counts.failed, 1);
    assert.ok(batch.items.filter((item) => item.executed).every((item) => item.runId));
}));

test('准备失败或超时取消明确列出未执行项，不误算通过', () => workspace(async ({ root }) => {
    const flows = [{ id: 'weiran4j/one' }, { id: 'weiran4j/two' }];
    let calls = 0;
    const invalid = await runBatch(root, flows, { dryRun: true, prepare: (flow) => { if (flow.id.endsWith('one')) throw new Error('缺参数'); return {}; }, run: () => { calls++; } });
    assert.equal(calls, 0); assert.equal(invalid.counts.failed, 1); assert.equal(invalid.counts.skipped, 1);
    let stopped = false;
    const timed = await runBatch(root, flows, { prepare: () => ({ runId: 'synthetic', directory: root }),
        run: async () => { stopped = true; return { ok: false, failureKind: 'TIMEOUT' }; }, shouldStop: () => stopped });
    assert.equal(timed.ok, false); assert.equal(timed.counts.failed, 1); assert.equal(timed.counts.skipped, 1);
}));

test('skipped、flaky、降级始终严格失败，不允许复核变成 partial 成功', () => workspace(async ({ root, addNative, cli }) => {
    const flow = addNative('weiran4j/skipped', 'expect(1).toBe(1);', 2);
    fs.appendFileSync(path.join(root, flow.entry), "test.skip('not-run',()=>{});");
    assert.equal(cli('run', flow.id).status, 1);
    const runId = runHistory(root)[0].runId;
    assert.equal(cli('verify', runId).status, 1);
    assert.equal(cli('feedback', flow.id, '--verdict', 'useful', '--run-id', runId).status, 1);
    const report = { stats: { expected: 0, unexpected: 0, skipped: 0, flaky: 1 }, suites: [{ specs: [{ title: 'flaky', file: flow.entry, tests: [{ projectName: 'api', status: 'flaky', results: [{ status: 'passed', attachments: [] }] }] }] }] };
    const record = { flow: { ...flow, expectedCases: 1 }, status: 'passed', exitCode: 0, evidenceVersion: 2, evidenceDigests: [] };
    assert.equal(verifyReport(record, report, root).ok, false);
    report.stats = { expected: 1, unexpected: 0, skipped: 0, flaky: 0 };
    const item = report.suites[0].specs[0].tests[0]; item.status = 'expected';
    item.results[0].attachments.push({ name: 'skipped-assertions', body: Buffer.from('{}').toString('base64'), contentType: 'application/json' });
    record.evidenceDigests = captureEvidence(record.flow, report, root);
    assert.equal(verifyReport(record, report, root).ok, false);
}));

test('portal 地址、入口和登录模式有界，拒绝秘密字段与跨源路径', () => {
    const profile = { apiBaseURL: 'http://localhost:5200', webBaseURL: 'http://localhost:5202', portals: {
        admin: { baseURL: 'http://localhost:6002', loginPath: '/sign-in', homePath: '/dashboard', loginMode: 'manual' },
    } };
    const resolved = resolveExecution({ params: [], portal: 'admin' }, profile, {}, {}, {});
    assert.equal(resolved.environment.webBaseURL, 'http://localhost:6002');
    assert.equal(resolved.portal.homePath, '/dashboard');
    assert.equal(resolveExecution({ params: [] }, profile, { 'web-base-url': 'http://localhost:7002' }, {}, {}).environment.webBaseURL, 'http://localhost:7002');
    assert.throws(() => resolveExecution({ params: [] }, { ...profile, portals: { admin: { password: 'not-allowed' } } }), /非秘密|只保存/);
    assert.throws(() => resolveExecution({ params: [] }, { ...profile, portals: { admin: { loginPath: '//evil.example' } } }), /同源/);
});

test('多页面上限、证据归属、失败汇总与关闭失败均可观察', async () => {
    let active = 0, maximum = 0, closed = 0;
    const context = { newPage: async () => { active++; maximum = Math.max(maximum, active); return { close: async () => { active--; closed++; } }; } };
    const names = [];
    const scenarios = [1, 2, 3].map((n) => ({ name: `scenario-${n}`, run: async (_page, attach) => {
        await new Promise((resolve) => setTimeout(resolve, 10)); await attach('state', { body: '{}', contentType: 'application/json' });
        if (n === 2) throw new Error('fixture-secret');
    } }));
    await assert.rejects(runParallelPages(context, scenarios, { attach: async (name) => { names.push(name); } }, { maxConcurrency: 2 }), (error) => error.message.includes('scenario-2') && !error.message.includes('fixture-secret'));
    assert.equal(maximum, 2); assert.equal(closed, 3); assert.equal(names.length, 3);
    await assert.rejects(runParallelPages(context, [scenarios[0], scenarios[0]], { attach: async () => {} }), /重复/);
    await assert.rejects(runParallelPages({ newPage: async () => ({ close: async () => { throw new Error('secret'); } }) }, [{ name: 'close', run: async () => {} }], { attach: async () => {} }), /关闭失败/);
});

test('人工登录适配器保存 Cookie，失败后清理或保留私有恢复记录', () => workspace(async ({ root }) => {
    const { mockCookieFetch, storageState, TOKEN_VALUE } = await import('./cookie-fixture.mjs');
    const previous = globalThis.fetch;
    const { state, fetcher } = mockCookieFetch(); globalThis.fetch = fetcher;
    let closed = 0;
    const browserType = { launch: async (options) => {
        assert.equal(options.headless, false);
        return { close: async () => { closed++; }, newContext: async () => ({
            close: async () => {}, storageState: async () => storageState(),
            newPage: async () => ({ goto: async () => {}, waitForURL: async () => {} }),
        }) };
    } };
    const addresses = { apiBaseURL: 'http://localhost:5200', webBaseURL: 'http://localhost:5202' };
    try {
        const result = await loginWindow(root, 'local', 'admin', {}, browserType);
        assert.equal(result.saved, true); assert.ok(!JSON.stringify(result).includes(TOKEN_VALUE));
        assert.equal(fs.statSync(path.join(root, '.local/sessions/local/admin.json')).mode & 0o777, 0o600);
        const { clearSession, recoverSessions } = await import('../session.mjs');
        await clearSession(root, 'local', 'admin', addresses);
        state.failIdentity = true;
        await assert.rejects(loginWindow(root, 'local', 'admin', {}, browserType), /身份核验/);
        assert.equal(closed, 2);
        assert.equal(fs.readdirSync(path.join(root, '.local/sessions/local/admin.recovery')).length, 0);
        state.failCleanup = true;
        await assert.rejects(loginWindow(root, 'local', 'admin', {}, browserType), (error) => {
            assert.equal(error.code, 'CLEANUP');
            assert.deepEqual(error.failures.map((item) => item.kind), ['ENVIRONMENT','CLEANUP']);
            assert.ok(!JSON.stringify(error).includes(TOKEN_VALUE)); return true;
        });
        state.failIdentity = state.failCleanup = false;
        assert.equal((await recoverSessions(root, 'local', 'admin', addresses)).recovered, 1);
    } finally { globalThis.fetch = previous; }
}));
