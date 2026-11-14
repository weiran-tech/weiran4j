import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { dependencyGraph, inspectSteps, checkDiscovery, probeService } from "../inspect.mjs";
import { flowHash } from "../core.mjs";

function fixture(run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-inspect-'));
    const root = path.join(repo, 'tests');
    const write = (file, content) => {
        const target = path.resolve(root, file);
        fs.mkdirSync(path.dirname(target), { recursive: true });
        fs.writeFileSync(target, content);
    };
    try { return run(root, write); }
    finally { fs.rmSync(repo, { recursive: true, force: true }); }
}

const flow = () => ({ id: 'demo/read', runner: 'playwright', project: 'api', entry: 'api/read.spec.ts',
    steps: ['support/steps/demo/read.ts', 'support/steps/demo/shared.ts'], inputs: [],
    manifest: 'api/flow.json', plan: 'api/plan.md', expectedCases: 1 });
function setup(write) {
    write('api/read.spec.ts', "import { read } from '../support/steps/demo/read.js'; // import '../steps/fake.ts'\nread();");
    write('support/steps/demo/read.ts', "export { read } from './shared';");
    write('support/steps/demo/shared.ts', 'export function read() {}');
    write('support/steps/INDEX.md', '| `demo/read.ts` | read |\n| `demo/shared.ts` | shared |');
}

test('AST 解析重导出、动态引用、循环和 .js→.ts；注释不作为依赖', () => fixture((root, write) => {
    setup(write);
    write('support/steps/demo/shared.ts', "import './read'; export function read() { return import('./data.json'); }");
    write('support/steps/demo/data.json', '{}');
    const files = dependencyGraph(root, [flow().entry]);
    assert.equal(files.length, 4);
    assert.ok(files.includes('support/steps/demo/data.json'));
    assert.ok(!files.some((file) => file.includes('fake')));
    write('support/steps/demo/shared.ts', "import './missing';");
    assert.throws(() => dependencyGraph(root, [flow().entry]), /无法解析/);
    write('support/steps/demo/shared.ts', 'import(variable);');
    assert.throws(() => dependencyGraph(root, [flow().entry]), /动态依赖/);
}));

test('校验间接步骤声明、无引用步骤、索引缺失和失效', () => fixture((root, write) => {
    setup(write);
    assert.deepEqual(inspectSteps(root, [flow()]), []);
    const omitted = flow(); omitted.steps.pop();
    assert.ok(inspectSteps(root, [omitted]).some((issue) => issue.includes('实际引用步骤未声明')));
    write('support/steps/demo/unused.ts', 'export function unused() {}');
    write('support/steps/INDEX.md', '`demo/read.ts`\n`demo/unused.ts`\n`demo/stale.ts`');
    const issues = inspectSteps(root, [flow()]);
    assert.ok(issues.some((issue) => issue.includes('无流程引用')));
    assert.ok(issues.some((issue) => issue.includes('未登记 INDEX')));
    assert.ok(issues.some((issue) => issue.includes('INDEX 步骤不存在')));
    const unused = flow(); unused.steps.push('support/steps/demo/unused.ts');
    assert.ok(inspectSteps(root, [unused]).some((issue) => issue.includes('声明步骤未被引用')));
}));

test('实际间接依赖即使未手写 inputs 也参与指纹', () => fixture((root, write) => {
    setup(write);
    write('support/steps/demo/shared.ts', "export { read } from '../../helpers/util';");
    write('support/helpers/util.ts', 'export function read() { return 1; }');
    for (const file of ['playwright.config.ts', '../package.json', '../pnpm-lock.yaml', 'framework/cli.mjs', 'framework/core.mjs',
        'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs', flow().manifest, flow().plan]) write(file, 'initial');
    const before = flowHash(root, flow());
    write('support/helpers/util.ts', 'export function read() { return 2; }');
    assert.notEqual(before, flowHash(root, flow()));
}));

test('本地依赖不能通过符号链接逃逸仓库', () => fixture((root, write) => {
    setup(write);
    fs.symlinkSync(os.tmpdir(), path.join(root, 'outside'));
    write('api/read.spec.ts', "import '../outside';");
    // 一个不存在的引用必须被拒绝；真实越界文件单独构造。
    assert.throws(() => dependencyGraph(root, [flow().entry]), /无法解析/);
    fs.symlinkSync(import.meta.filename, path.join(root, 'external.mjs'));
    write('api/read.spec.ts', "import '../external.mjs';");
    assert.throws(() => dependencyGraph(root, [flow().entry]), /越界/);
}));

const discovery = () => ({ suites: [{ file: 'api/read.spec.ts', specs: [{ file: 'api/read.spec.ts', tests: [{ projectName: 'api' }] }] }], errors: [] });
test('深度发现核对 project、精确用例数量、未注册用例与加载错误', () => {
    const item = flow(); item.entry = 'api/read.spec.ts';
    assert.deepEqual(checkDiscovery([item], discovery()), []);
    assert.ok(checkDiscovery([{ ...item, expectedCases: 2 }], discovery()).some((issue) => issue.includes('数量不符')));
    assert.ok(checkDiscovery([], discovery()).some((issue) => issue.includes('未登记')));
    const failed = discovery(); failed.errors.push({ message: 'load error' });
    assert.ok(checkDiscovery([item], failed).some((issue) => issue.includes('加载错误')));
});

test('doctor 探测区分正常、HTTP 健康失败、超时与不可连接，不透出响应秘密', async () => {
    const expected = (status, body) => status === 200 && body.data.status === 'UP';
    const response = (status, health) => async () => ({ status, json: async () => ({ data: { status: health }, secret: 'do-not-print' }) });
    assert.equal((await probeService('health', 'http://localhost', '/health', expected, response(200, 'UP'))).ok, true);
    const down = await probeService('health', 'http://localhost', '/health', expected, response(503, 'DOWN'));
    assert.equal(down.ok, false);
    assert.equal(down.status, 503);
    assert.ok(!JSON.stringify(down).includes('do-not-print'));
    const timeout = await probeService('api', 'http://localhost', '/', expected, async () => { throw new DOMException('', 'TimeoutError'); });
    assert.equal(timeout.detail, '连接超时');
    const refused = await probeService('api', 'http://localhost', '/', expected, async () => { throw new TypeError('sensitive'); });
    assert.equal(refused.detail, '无法连接');
    const malformed = await probeService('api', 'http://localhost', '/', expected, async () => ({ status: 200, json: async () => { throw new SyntaxError('secret'); } }));
    assert.equal(malformed.status, 200);
    assert.equal(malformed.detail, '响应无法解析为 JSON');
});

test('读取测试 tsconfig 的路径映射，配置与本地映射文件均进入依赖', () => fixture((root, write) => {
    setup(write);
    write('tsconfig.json', JSON.stringify({ compilerOptions: { moduleResolution: 'bundler', paths: { '#helpers/*': ['./support/helpers/*'] } } }));
    write('support/steps/demo/shared.ts', "export { read } from '#helpers/read';");
    write('support/helpers/read.ts', 'export function read() {}');
    const files = dependencyGraph(root, [flow().entry]);
    assert.ok(files.includes('tsconfig.json'));
    assert.ok(files.includes('support/helpers/read.ts'));
}));

test('配置多级 extends、数组继承与父配置变动参与指纹，缺失配置拒绝', () => fixture((root, write) => {
    setup(write);
    write('../base.json', '{"compilerOptions":{"strict":true}}');
    write('../middle.json', '{"extends":"./base.json"}');
    write('../extra.json', '{"compilerOptions":{"target":"ES2022"}}');
    write('tsconfig.json', '{"extends":["../middle.json","../extra.json"]}');
    for (const file of ['playwright.config.ts', '../package.json', '../pnpm-lock.yaml', 'framework/cli.mjs', 'framework/core.mjs',
        'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs', flow().manifest, flow().plan]) write(file, 'initial');
    const files = dependencyGraph(root, [flow().entry]);
    for (const name of ['../base.json', '../middle.json', '../extra.json']) assert.ok(files.includes(name));
    const before = flowHash(root, flow());
    write('../base.json', '{"compilerOptions":{"strict":false}}');
    assert.notEqual(before, flowHash(root, flow()));
    write('tsconfig.json', '{"extends":"./missing.json"}');
    assert.throws(() => dependencyGraph(root, [flow().entry]));
}));

test('Bruno 生效的 collection 和父目录 folder 配置参与指纹', () => fixture((root, write) => {
    const item = { ...flow(), runner: 'bruno', entry: 'bruno/domain/read.yml', steps: [], inputs: [] };
    for (const file of [item.entry, item.manifest, item.plan, 'bruno/opencollection.yml', '../package.json', '../pnpm-lock.yaml',
        'framework/cli.mjs', 'framework/core.mjs', 'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs']) write(file, 'initial');
    const before = flowHash(root, item);
    write('bruno/opencollection.yml', 'collection settings');
    const collection = flowHash(root, item);
    assert.notEqual(collection, before);
    write('bruno/domain/folder.yml', 'folder settings');
    const folder = flowHash(root, item);
    assert.notEqual(folder, collection);
    write('bruno/domain/folder.yml', 'changed folder settings');
    assert.notEqual(flowHash(root, item), folder);
}));
