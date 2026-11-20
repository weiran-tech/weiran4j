import test, { after } from 'node:test';
import os from 'node:os';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { reportData } from './report-data.mjs';
import { FLOW_TAGS } from '../core.mjs';
// CLI tests own their workspace: parallel invocations must not share catalogs or history.
const sourceRepository = path.resolve(import.meta.dirname, '../../..');
const repository = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-commands-')));
fs.cpSync(path.join(sourceRepository, 'tests'), path.join(repository, 'tests'), { recursive: true,
    filter: (file) => !['.local', '.artifacts', 'unit'].includes(path.basename(file)) });
for (const file of ['package.json', 'pnpm-lock.yaml']) fs.copyFileSync(path.join(sourceRepository, file), path.join(repository, file));
fs.symlinkSync(path.join(sourceRepository, 'node_modules'), path.join(repository, 'node_modules'));
after(() => fs.rmSync(repository, { recursive: true, force: true }));
const scripts = JSON.parse(fs.readFileSync(path.join(repository, 'package.json'))).scripts;
const root = path.join(repository, 'tests');
const flows = JSON.parse(fs.readFileSync(path.join(root, 'registry.json'))).flows.map((file) => JSON.parse(fs.readFileSync(path.join(root, file))));
function preview(name, args = []) {
    const [executable, ...command] = scripts[name].split(' ');
    assert.equal(executable, 'node');
    const result = spawnSync(process.execPath, [...command, ...args, '--dry-run'], { cwd: repository, encoding: 'utf8', timeout: 15000 });
    const offset = result.stdout.lastIndexOf('{\n  "batchId":');
    assert.ok(offset >= 0, result.stdout + result.stderr);
    const batch = JSON.parse(result.stdout.slice(offset));
    assert.equal(batch.dryRun, true);
    assert.equal(batch.reportFile, undefined);
    assert.equal(result.status, batch.ok ? 0 : 1);
    return batch;
}

test('分类脚本执行真实 CLI 选择，全量/类型/标签共用同一套批次与报告语义', () => {
    const selections = [
        ['test:flows:all', [], flows],
        ['test:flows:api', [], flows.filter((flow) => flow.project === 'api')],
        ['test:flows:e2e', [], flows.filter((flow) => flow.project === 'e2e')],
        ['test:flows:bruno', [], flows.filter((flow) => flow.runner === 'bruno')],
        ['test:flows:all', ['--type', 'api'], flows.filter((flow) => flow.project === 'api')],
        ['test:flows:all', ['--tag', 'smoke', '--headless'], flows.filter((flow) => flow.tags.includes('smoke'))],
        ['test:flows:api', ['--tag', 'permission'], flows.filter((flow) => flow.project === 'api' && flow.tags.includes('permission'))],
        ...FLOW_TAGS.filter((tag) => flows.some((flow) => flow.tags.includes(tag))).map((tag) => ['test:flows:all', ['--tag', tag], flows.filter((flow) => flow.tags.includes(tag))]),
    ];
    for (const [name, args, expected] of selections) {
        const batch = preview(name, args);
        assert.deepEqual(batch.items.map((item) => item.flowId), expected.map((flow) => flow.id), name);
        const type = args.includes('--type') ? args[args.indexOf('--type') + 1] : name === 'test:flows:api' ? 'api' : name === 'test:flows:e2e' ? 'e2e' : undefined;
        assert.equal(batch.selection.type, type);
        assert.equal(Object.hasOwn(batch.selection, 'project'), false);
    }
});

test('list 终端模式保留流程筛选且不生成目录，输出模式冲突直接拒绝', () => {
    const catalogs = () => fs.existsSync(path.join(root, '.artifacts/catalog')) ? fs.readdirSync(path.join(root, '.artifacts/catalog')).sort() : [];
    const before = catalogs();
    const cli = (...args) => spawnSync(process.execPath, ['tests/framework/cli.mjs', 'list', ...args], { cwd: repository, encoding: 'utf8', timeout: 15000 });
    const text = cli('--text', '--type', 'api', '--tag', 'permission');
    assert.equal(text.status, 0, text.stderr);
    const expected = flows.filter((flow) => flow.project === 'api' && flow.tags.includes('permission'));
    assert.deepEqual(text.stdout.trim().split('\n').map((line) => line.split('\t')[0]), expected.map((flow) => flow.id));
    const json = cli('--json', '--type', 'api', '--tag', 'permission');
    assert.equal(json.status, 0, json.stderr);
    assert.deepEqual(JSON.parse(json.stdout).map((flow) => flow.id), expected.map((flow) => flow.id));
    for (const args of [['--text', '--json'], ['--text', '--no-open'], ['--json', '--timeout-ms', '1'], ['--text', '--tag', 'blocked']]) assert.equal(cli(...args).status, 1);
    assert.deepEqual(catalogs(), before);
});

test('list 默认生成只读全量目录，并支持类型和标签筛选，不生成批次', async () => {
    assert.equal(scripts['test:flows:list'], 'node tests/framework/cli.mjs list');
    assert.equal(scripts['test:flows:ui'], undefined);
    assert.match(scripts['test:integration:ui'], /--type e2e/);
    const batches = () => fs.existsSync(path.join(root, '.artifacts/batches')) ? fs.readdirSync(path.join(root, '.artifacts/batches')).sort() : [];
    const before = batches();
    for (const args of [[], ['--type', 'api', '--tag', 'permission'], ['--runner', 'bruno'], ['合同'], ['--step', 'auth/login'], ['no-match']]) {
        const result = spawnSync(process.execPath, ['tests/framework/cli.mjs', 'list', '--no-open', ...args], { cwd: repository, encoding: 'utf8', timeout: 15000 });
        assert.equal(result.status, 0, result.stdout + result.stderr);
        const output = JSON.parse(result.stdout.slice(0, result.stdout.indexOf('\n}') + 2));
        assert.equal(output.executed, false);
        const data = await reportData(output.reportFile);
        const tests = data['report.json'].files.flatMap((file) => file.tests);
        const expected = args.includes('api') ? flows.filter((flow) => flow.project === 'api' && flow.tags.includes('permission'))
            : args.includes('bruno') ? flows.filter((flow) => flow.runner === 'bruno')
            : args.includes('合同') ? flows.filter((flow) => flow.title.includes('合同'))
            : args.includes('--step') ? flows.filter((flow) => flow.steps.includes('support/steps/auth/login.ts'))
            : args.includes('no-match') ? [] : flows;
        assert.equal(tests.length, expected.reduce((sum, flow) => sum + flow.expectedCases, 0));
        assert.deepEqual(new Set(tests.flatMap((item) => item.annotations.filter((note) => note.type === 'flow').map((note) => note.description.split(' · ')[0]))), new Set(expected.map((flow) => flow.id)));
    }
    assert.deepEqual(batches(), before);
});


test('默认 run 选择全量，旧 --all 参数被拒绝，框架回归独立于前端测试', () => {
    const batch = preview('test:flows:all');
    assert.equal(batch.selection.mode, 'all');
    assert.equal(batch.counts.selected, flows.length);
    const result = spawnSync(process.execPath, ['tests/framework/cli.mjs', 'run', '--all', '--dry-run'], { cwd: repository, encoding: 'utf8' });
    assert.equal(result.status, 1);
    assert.equal(scripts.test, 'pnpm --filter @weiran/manage test');
});
