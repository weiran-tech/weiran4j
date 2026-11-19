import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runBatch } from '../batch.mjs';
import { locateReport, writeBatchReport } from '../report.mjs';
import { digest } from '../core.mjs';
import { reportData, serveFolder } from './report-data.mjs';

async function workspace(run) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-native-report-'));
    const write = (file, value) => { const target = path.join(root, file); fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, value); };
    const json = (file, value) => write(file, JSON.stringify(value));
    try { await run({ root, write, json }); } finally { fs.rmSync(root, { recursive: true, force: true }); }
}
const runId = '20261118000000000-aaaaaaaa', otherId = '20261118000000000-bbbbbbbb', batchId = '20261118000000000-cccccccc';

function saveRun(json, id, results, { project = 'api', runner = 'playwright', ok = true } = {}) {
    json(`.artifacts/runs/${id}/run.json`, { flow: { project, runner, entry: 'api/test.spec.ts' }, resultsHash: digest(JSON.stringify(results)), secret: 'DO-NOT-SHOW-CREDENTIALS' });
    json(`.artifacts/runs/${id}/results.json`, results);
    json(`.artifacts/runs/${id}/verification.json`, { ok, complete: ok, issues: ok ? [] : ['strict verification failed'] });
}

test('原生 Playwright 报告汇集用例、原始耗时、步骤、错误和附件，并隔离严格复核', () => workspace(async ({ root, write, json }) => {
    const report = { stats: { expected: 1, unexpected: 1, skipped: 0, flaky: 0 }, errors: [], suites: [{ title: 'suite', specs: [
        { title: 'success case', tests: [{ projectName: 'api', status: 'expected', results: [{ status: 'passed', duration: 12, steps: [{ title: 'read profile', duration: 5 }], attachments: [{ name: 'state', body: Buffer.from('{"selected":true}').toString('base64'), contentType: 'application/json' }] }] }] },
        { title: 'failed case', tests: [{ projectName: 'api', status: 'unexpected', results: [{ status: 'failed', duration: 25, errors: [{ message: '<script>failure message</script>' }], attachments: [{ name: 'screenshot', path: 'results/failure.png', contentType: 'image/png' }] }] }] },
    ] }] };
    saveRun(json, runId, report, { ok: false });
    write(`.artifacts/runs/${runId}/results/failure.png`, 'fake png');
    saveRun(json, otherId, [{ results: [{ path: 'bruno/check.yml', status: 'fail', response: { body: 'DO-NOT-SHOW-FULL-RESPONSE' }, testResults: [{ name: 'reject anonymous', status: 'fail', error: 'Bruno assertion failed' }] }] }], { runner: 'bruno', project: undefined, ok: false });
    const batch = { batchId, status: 'failed', environment: 'local', selection: { mode: 'all' }, items: [
        { flowId: 'system/playwright', runId, status: 'failed', executed: true, project: 'api' },
        { flowId: 'system/bruno', runId: otherId, runner: 'bruno', status: 'failed', executed: true },
        { flowId: 'system/blocked', status: 'blocked', reason: '缺少业务账号', project: 'e2e' },
    ] };
    json(`.artifacts/batches/${batchId}/batch.json`, batch);
    const verification = fs.readFileSync(path.join(root, `.artifacts/runs/${runId}/verification.json`));
    const file = await writeBatchReport(root, batch), data = await reportData(file);
    assert.deepEqual(new Set(data['report.json'].projectNames), new Set(['api', 'bruno', 'execution']));
    const text = JSON.stringify(data);
    for (const name of ['success case', 'failed case', 'read profile', 'selected', 'strict verification failed', 'bruno/check.yml', 'Bruno assertion failed', '缺少业务账号']) assert.ok(text.includes(name), name);
    assert.doesNotMatch(text, /DO-NOT-SHOW-CREDENTIALS|DO-NOT-SHOW-FULL-RESPONSE/);
    const nativeCases = Object.values(data).flatMap((value) => value.tests ?? []);
    assert.equal(nativeCases.find((value) => value.title.endsWith('success case')).duration, 12);
    assert.ok(data['report.json'].stats.unexpected > 0); assert.ok(data['report.json'].stats.skipped > 0);
    assert.deepEqual(fs.readFileSync(path.join(root, `.artifacts/runs/${runId}/verification.json`)), verification);
    assert.equal(locateReport(root, runId).id, batchId);
    const server = serveFolder(path.dirname(file)); await server.start({ port: 0, host: '127.0.0.1' });
    try {
        const url = server.urlPrefix('precise');
        assert.match(url, /127\.0\.0\.1/);
        assert.equal((await fetch(url)).status, 200);
        const screenshot = nativeCases.flatMap((value) => value.results).flatMap((value) => value.attachments).find((value) => value.name === 'screenshot');
        assert.equal((await fetch(`${url}/${screenshot.path}`)).status, 200);
        const forbidden = `${url}/trace/file?path=${encodeURIComponent(path.join(root, `.artifacts/runs/${runId}/run.json`))}`;
        assert.notEqual((await fetch(forbidden)).status, 200);
    } finally { await server.stop(); }
}));

test('准备失败与阻塞也生成原生报告；预览不写产物', () => workspace(async ({ root }) => {
    const flows = [{ id: 'system/ready', runner: 'playwright', project: 'api' }, { id: 'system/blocked', project: 'e2e', blockedReason: '缺账号' }];
    const options = { prepare: () => { throw new Error('缺参数'); }, run: () => assert.fail('不能启动') };
    await runBatch(root, flows, { ...options, dryRun: true });
    assert.equal(fs.existsSync(path.join(root, '.artifacts')), false);
    const batch = await runBatch(root, flows, options);
    const data = await reportData(batch.reportFile);
    assert.equal(batch.ok, false); assert.equal(batch.counts.blocked, 1);
    assert.match(JSON.stringify(data), /缺参数/); assert.match(JSON.stringify(data), /缺账号/);
    assert.equal(batch.reportCommand, `pnpm test:flows report ${batch.batchId}`);
}));

test('摘要异常、缺失结果和附件越界在原生报告中失败，不能误算全绿', () => workspace(async ({ root, write, json }) => {
    const result = { suites: [{ specs: [{ title: 'passed body', tests: [{ projectName: 'api', status: 'expected', results: [{ status: 'passed', attachments: [{ name: 'leak', path: '../../../.local/admin.json', contentType: 'application/json' }] }] }] }] }] };
    saveRun(json, runId, result);
    json(`.artifacts/runs/${runId}/run.json`, { resultsHash: 'changed', flow: { project: 'api' } });
    write('.local/admin.json', 'DO-NOT-SHOW-PASSWORD');
    const batch = { batchId, status: 'failed', items: [{ flowId: 'system/body', runId, executed: true, status: 'failed' }, { flowId: 'system/missing', runId: otherId, executed: true, status: 'failed' }] };
    json(`.artifacts/batches/${batchId}/batch.json`, batch);
    const data = await reportData(await writeBatchReport(root, batch));
    assert.match(JSON.stringify(data), /原生结果缺少校验值或内容已变化/);
    assert.match(JSON.stringify(data), /附件缺失或路径越界/);
    assert.doesNotMatch(JSON.stringify(data), /DO-NOT-SHOW-PASSWORD/);
    assert.ok(data['report.json'].stats.unexpected > 0);
}));

test('报告默认最近批次、支持环境及 runId 定位；孤立历史 HTML 保持可用', () => workspace(async ({ root, write, json }) => {
    json(`.artifacts/batches/${batchId}/batch.json`, { batchId, environment: 'local', items: [{ runId }] });
    json(`.artifacts/batches/${otherId}/batch.json`, { batchId: otherId, environment: 'stage', items: [] });
    assert.equal(locateReport(root).id, batchId);
    assert.equal(locateReport(root, undefined, { env: 'stage' }).id, otherId);
    assert.equal(locateReport(root, runId).id, batchId);
    assert.throws(() => locateReport(root, '../../.local'), /有效/);
    write(`.artifacts/runs/${otherId}/report/index.html`, 'historical');
    fs.unlinkSync(path.join(root, `.artifacts/batches/${otherId}/batch.json`));
    assert.equal(locateReport(root, otherId).kind, 'run');
}));

test('最新复核失败时保留原始记录，并在原生报告增加失败检查', () => workspace(async ({ root, json }) => {
    const results = { suites: [{ specs: [{ title: 'original success', tests: [{ projectName: 'api', status: 'expected', results: [{ status: 'passed' }] }] }] }] };
    saveRun(json, runId, results);
    json(`.artifacts/runs/${runId}/reverification.json`, { ok: false, complete: false, issues: ['latest evidence corrupted'] });
    const original = fs.readFileSync(path.join(root, `.artifacts/runs/${runId}/verification.json`));
    const batch = { batchId, status: 'passed', ok: true, items: [{ flowId: 'system/original', runId, project: 'api', status: 'passed', executed: true }] };
    json(`.artifacts/batches/${batchId}/batch.json`, batch);
    const data = await reportData(await writeBatchReport(root, batch));
    assert.equal(data['report.json'].stats.expected, 1);
    assert.equal(data['report.json'].stats.unexpected, 1);
    assert.match(JSON.stringify(data), /latest evidence corrupted/);
    assert.deepEqual(fs.readFileSync(path.join(root, `.artifacts/runs/${runId}/verification.json`)), original);
    assert.equal(JSON.parse(fs.readFileSync(path.join(root, `.artifacts/batches/${batchId}/batch.json`))).status, 'passed');
}));
