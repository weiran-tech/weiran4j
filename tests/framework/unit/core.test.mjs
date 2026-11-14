import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inside, loadFlows, validateFlow, resolveExecution, flowHash, verifyReport, captureEvidence } from "../core.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const flows = loadFlows(root);
const fixture = (callback) => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-flow-test-'));
    try { return callback(directory); }
    finally { fs.rmSync(directory, { recursive: true, force: true }); }
};
const record = (flow = flows[0]) => ({ status: 'passed', exitCode: 0, evidenceVersion: 2, evidenceDigests: [], flow: structuredClone(flow) });
const report = (overrides = {}) => ({ stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0 }, errors: [],
    suites: [{ specs: [{ title: 'case', file: 'api/system/health/health.spec.ts', tests: [{ projectName: 'api', status: 'expected', results: [{ status: 'passed', attachments: [] }], ...overrides }] }] }] });

// 复核器必须验证实际结果与每个用例自己的证据，不能只信退出码或聚合统计。
test('退出码为 0 但空跑、跳过、flaky、报告错误和数量不符均失败', () => fixture((directory) => {
    const run = record(); run.flow.evidence.requiredAttachments = [];
    assert.equal(verifyReport(run, { stats: { expected: 99, unexpected: 0, skipped: 0, flaky: 0 }, suites: [] }, directory).ok, false);
    for (const status of ['skipped', 'flaky', 'unexpected']) {
        assert.equal(verifyReport(run, report({ status }), directory).ok, false);
    }
    assert.throws(() => verifyReport(run, { suites: [] }, directory), /stats/);
    const globallyFailed = report(); globallyFailed.errors.push({ message: 'global teardown failed' });
    assert.equal(verifyReport(run, globallyFailed, directory).ok, false);
    run.flow.expectedCases = 2;
    assert.equal(verifyReport(run, report(), directory).ok, false);
}));

test('证据必须存在、非空、格式正确且位于本次运行目录内', () => fixture((directory) => {
    const run = record();
    const data = report();
    const attachments = data.suites[0].specs[0].tests[0].results[0].attachments;
    const file = path.join(directory, 'state.json');
    attachments.push({ name: 'health-state', path: file, contentType: 'application/json' });
    assert.equal(verifyReport(run, data, directory).ok, false);
    fs.writeFileSync(file, '');
    assert.equal(verifyReport(run, data, directory).ok, false);
    fs.writeFileSync(file, 'invalid json');
    assert.equal(verifyReport(run, data, directory).ok, false);
    fs.writeFileSync(file, '{"health":"UP"}');
    run.evidenceDigests = captureEvidence(run.flow, data, directory);
    assert.equal(verifyReport(run, data, directory).ok, true);
    attachments[0].path = path.join(root, 'registry.json');
    assert.equal(verifyReport(run, data, directory).ok, false);
}));

test('不能用一个用例的证据代替另一个用例，局部断言降级不能算完整通过', () => fixture((directory) => {
    const run = record(); run.flow.expectedCases = 2;
    const data = report();
    const cases = data.suites[0].specs[0].tests;
    const attachment = { name: 'health-state', body: Buffer.from('{}').toString('base64'), contentType: 'application/json' };
    cases[0].results[0].attachments.push(attachment);
    cases.push({ projectName: 'api', status: 'expected', results: [{ status: 'passed', attachments: [] }] });
    assert.equal(verifyReport(run, data, directory).ok, false);
    cases[1].results[0].attachments.push(attachment);
    data.stats.expected = 2;
    run.evidenceDigests = captureEvidence(run.flow, data, directory);
    assert.equal(verifyReport(run, data, directory).ok, true);
    cases[1].results[0].attachments.push({ ...attachment, name: 'skipped-assertions' });
    assert.equal(verifyReport(run, data, directory).ok, false);
}));

test('Bruno 无断言、跳过请求或断言失败时，即使进程成功也不能通过', () => fixture((directory) => {
    const run = record(flows.find((flow) => flow.runner === 'bruno'));
    const item = { status: 'pass', test: { filename: run.flow.entry.replace(/^bruno\//, '') }, path: 'request', testResults: [{ status: 'pass' }] };
    const data = [{ results: [item], summary: { errorRequests: 0 } }];
    run.evidenceDigests = captureEvidence(run.flow, data, directory);
    assert.equal(verifyReport(run, data, directory).ok, true);
    item.testResults = [];
    assert.equal(verifyReport(run, data, directory).ok, false);
    item.testResults = [{ status: 'fail' }];
    assert.equal(verifyReport(run, data, directory).ok, false);
    item.testResults = [{ status: 'pass' }]; item.skipped = true;
    assert.equal(verifyReport(run, data, directory).ok, false);
}));

test('定义校验拒绝越界、链接越界、写入流程缺清理证据和未知字段', () => fixture((directory) => {
    assert.throws(() => inside(root, '../package.json'), /越界/);
    fs.symlinkSync(path.join(root, 'registry.json'), path.join(directory, 'escape.json'));
    assert.throws(() => inside(directory, 'escape.json'), /越界/);
    const original = JSON.parse(fs.readFileSync(path.join(root, flows[0].manifest), 'utf8'));
    assert.doesNotThrow(() => validateFlow(original, root, flows[0].manifest));
    assert.throws(() => validateFlow({ ...original, expectedCases: 0 }, root, flows[0].manifest), /正整数/);
    assert.throws(() => validateFlow({ ...original, entry: '../package.json' }, root, flows[0].manifest), /越界/);
    assert.throws(() => validateFlow({ ...original, params: [{ name: 'TOKEN', description: 'token', secret: true, default: 'secret' }] }, root, flows[0].manifest), /秘密参数/);
    assert.throws(() => validateFlow({ ...original, evidence: { ...original.evidence, allowSkipped: true } }, root, flows[0].manifest), /不放行/);
    assert.throws(() => validateFlow({ ...original, kind: 'transition' }, root, flows[0].manifest), /清理证据/);
    assert.throws(() => validateFlow({ ...original, unknown: true }, root, flows[0].manifest), /未知字段/);
}));

test('参数只允许声明项，必填参数不能空，地址覆盖顺序明确', () => {
    const flow = { ...flows[0], params: [{ name: 'TOKEN', required: true, secret: true }] };
    const profile = { apiBaseURL: 'http://localhost:1', webBaseURL: 'http://localhost:2' };
    assert.throws(() => resolveExecution(flow, profile, {}, {}, {}), /缺少参数/);
    assert.throws(() => resolveExecution(flow, profile, {}, { UNKNOWN: 'x' }, {}), /未声明/);
    const resolved = resolveExecution(flow, profile, { 'api-base-url': 'http://localhost:3' }, {},
        { TEST_API_BASE_URL: 'http://localhost:4', FLOW_TOKEN: 'sensitive' });
    assert.equal(resolved.environment.apiBaseURL, 'http://localhost:3');
    assert.equal(resolved.environment.webBaseURL, profile.webBaseURL);
    assert.equal(resolved.values.TOKEN, 'sensitive');
    assert.throws(() => resolveExecution(flow, { ...profile, apiBaseURL: 'https://user:secret@example.com' }, {}, {}, {}), /无凭证/);
});

test('共享步骤变动也改变流程指纹', () => fixture((directory) => {
    const local = path.join(directory, 'tests');
    const flow = flows[0];
    for (const relative of [flow.manifest, flow.plan, flow.entry, ...flow.steps, ...flow.inputs,
        'playwright.config.ts', '../package.json', '../pnpm-lock.yaml', 'framework/cli.mjs', 'framework/core.mjs', 'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs']) {
        const file = path.resolve(local, relative);
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, 'initial');
    }
    const before = flowHash(local, flow);
    fs.writeFileSync(path.join(local, flow.steps[0]), 'changed shared step');
    assert.notEqual(flowHash(local, flow), before);
}));

test('API 和后台地址按 CLI、环境变量、profile 的顺序覆盖，拒绝旧 Actuator 配置', () => {
    const profile = { apiBaseURL: 'http://localhost:5200', webBaseURL: 'http://localhost:5202' };
    assert.equal(resolveExecution(flows[0], profile, {}, {}, {}).environment.apiBaseURL, profile.apiBaseURL);
    assert.equal(resolveExecution(flows[0], profile, {}, {}, { TEST_API_BASE_URL: 'http://localhost:6200' }).environment.apiBaseURL, 'http://localhost:6200');
    assert.equal(resolveExecution(flows[0], profile, { 'api-base-url': 'http://localhost:7200' }, {}, { TEST_API_BASE_URL: 'http://localhost:6200' }).environment.apiBaseURL, 'http://localhost:7200');
    assert.throws(() => resolveExecution(flows[0], { ...profile, actuatorBaseURL: 'http://localhost:1' }), /环境文件/);
});

test('报告必须匹配入口和 project，Bruno 必须匹配请求文件', () => fixture((directory) => {
    const run = record(); run.flow.evidence.requiredAttachments = [];
    const data = report();
    assert.equal(verifyReport(run, data, directory).ok, true);
    data.suites[0].specs[0].file = 'api/wrong.spec.ts';
    assert.equal(verifyReport(run, data, directory).ok, false);
    data.suites[0].specs[0].file = 'api/system/health/health.spec.ts';
    data.suites[0].specs[0].tests[0].projectName = 'e2e';
    assert.equal(verifyReport(run, data, directory).ok, false);
    const bruno = record(flows.find((item) => item.runner === 'bruno'));
    const bruReport = [{ results: [{ test: { filename: 'wrong.yml' }, status: 'pass', testResults: [{ status: 'pass' }] }] }];
    assert.equal(verifyReport(bruno, bruReport, directory).ok, false);
}));

test('附件改动、缺失摘要和旧版本证据不能复核通过', () => fixture((directory) => {
    const run = record();
    const data = report();
    const file = path.join(directory, 'state.json');
    fs.writeFileSync(file, '{"health":"UP"}');
    data.suites[0].specs[0].tests[0].results[0].attachments.push({ name: 'health-state', path: file, contentType: 'application/json' });
    run.evidenceDigests = captureEvidence(run.flow, data, directory);
    assert.equal(verifyReport(run, data, directory).ok, true);
    fs.writeFileSync(file, '{"health":"DOWN"}');
    assert.equal(verifyReport(run, data, directory).ok, false);
    fs.writeFileSync(file, '{"health":"UP"}');
    run.evidenceDigests = [];
    assert.equal(verifyReport(run, data, directory).ok, false);
    delete run.evidenceVersion;
    assert.equal(verifyReport(run, data, directory).ok, false);
}));
