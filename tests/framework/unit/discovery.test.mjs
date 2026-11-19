import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { discoverCases, writeCaseCatalog, startCaseCatalogServer } from '../discovery.mjs';
import { reportData } from './report-data.mjs';
import { locateReport } from '../report.mjs';

const require = createRequire(import.meta.url);
test('目录仅发现真实声明，列出各类型及阻塞原因，不调用测试、fixture、hook 或 Bruno 脚本', async () => {
    const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-discovery-')));
    const write = (name, body) => { const file = path.join(root, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body); };
    const flow = (id, runner, entry, project) => ({ id, runner, entry, project, title: `${id} 标题`, tags: ['smoke'], envs: ['local'], preconditions: ['前提'], expectedCases: 1 });
    const flows = [flow('system/api', 'playwright', 'api/probe.spec.mjs', 'api'),
        { ...flow('system/page', 'playwright', 'e2e/probe.spec.mjs', 'e2e'), blockedReason: '页面尚未提供', limitations: ['仅模拟页面，不证明真实接口'] },
        flow('system/manual', 'bruno', 'bruno/probe.yml')];
    try {
        write('playwright.config.ts', `export default { testDir: '.', projects: [{name:'api',testDir:'./api'}, {name:'e2e',testDir:'./e2e'}] };`);
        const declaration = `import {test as base} from ${JSON.stringify(require.resolve('@playwright/test').replace(/index\.js$/, 'index.mjs'))};
            const test=base.extend({ sentinel:[async({},use)=>{throw Error('fixture executed')},{auto:true}] });
            test.beforeAll(()=>{throw Error('hook executed')});
            test.describe('领域',()=>{test('真实名称',{tag:'@source'},()=>{throw Error('body executed')})});`;
        write('api/probe.spec.mjs', declaration); write('e2e/probe.spec.mjs', declaration);
        write('bruno/probe.yml', 'info:\n  name: 手工请求\n  type: http\n  seq: 1\nhttp:\n  method: GET\n  url: http://127.0.0.1:1/never\nruntime:\n  scripts:\n    - type: tests\n      code: throw new Error("Bruno script executed");\n');
        const cases = discoverCases(root, flows);
        assert.deepEqual(cases.map((entry) => entry.title), ['领域 / 真实名称', '领域 / 真实名称', '手工请求']);
        assert.equal(fs.existsSync(path.join(root, '.artifacts')), false);
        const file = await writeCaseCatalog(root, cases);
        const data = await reportData(file), report = data['report.json'];
        assert.deepEqual(report.projectNames, ['api', 'e2e', 'bruno']);
        const tests = report.files.flatMap((item) => item.tests);
        assert.equal(tests.length, cases.length);
        assert.ok(tests.every((item) => item.outcome === 'skipped' && item.title.startsWith('未执行 ·')));
        assert.ok(tests.some((item) => item.tags.includes('@source')));
        const details = Object.entries(data).filter(([name]) => name !== 'report.json').map(([, value]) => value);
        assert.match(JSON.stringify(details), /页面尚未提供/);
        assert.match(JSON.stringify(details), /仅模拟页面，不证明真实接口/);
        assert.ok(details.flatMap((item) => item.tests).every((item) => item.results.length === 0));
        assert.equal(fs.existsSync(path.join(root, '.artifacts/runs')), false);
        assert.throws(() => locateReport(root), /没有可查看的批次报告/);
        const { server, url } = await startCaseCatalogServer(file);
        try {
            assert.equal(new URL(url).hostname, '127.0.0.1');
            assert.equal(new URL(url).hash, '#?q=s:skipped');
            assert.equal((await fetch(url)).status, 200);
        }
        finally { await server.stop(); }
        assert.throws(() => discoverCases(root, [{ ...flows[0], expectedCases: 2 }, ...flows.slice(1)]), /发现用例数量不符/);
        write('api/probe.spec.mjs', 'throw Error("declaration load failed")');
        assert.throws(() => discoverCases(root, flows), /用例发现失败/);
    } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
