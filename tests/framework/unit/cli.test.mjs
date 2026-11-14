import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { once } from 'node:events';
import { createHash } from 'node:crypto';
import { executeProcess } from "../process.mjs";
import { validateBruno } from "../bruno.mjs";

const source = path.resolve(import.meta.dirname, '../..');
async function fixture(run) {
    const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran4j-cli-'));
    const write = (name, body) => {
        const file = path.join(repo, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, body);
    };
    const json = (name, value) => write(name, JSON.stringify(value));
    try {
        for (const name of ['framework/cli.mjs', 'framework/core.mjs', 'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs']) {
            write(`tests/${name}`, fs.readFileSync(path.join(source, name)));
        }
        fs.cpSync(path.join(source, 'framework/templates'), path.join(repo, 'tests/framework/templates'), { recursive: true });
        fs.symlinkSync(path.resolve(source, '../node_modules'), path.join(repo, 'node_modules'));
        json('package.json', { private: true, type: 'module' });
        write('pnpm-lock.yaml', 'lockfileVersion: 9');
        write('tests/support/fixtures/test.ts', `import{test as base,expect,type APIRequestContext}from'@playwright/test';export const test=base.extend<{backend:APIRequestContext}>({backend:async({playwright},use)=>{const api=await playwright.request.newContext();try{await use(api);}finally{await api.dispose();}}});export{expect};`);
        write('tests/support/steps/INDEX.md', '# Steps');
        write('tests/bruno/opencollection.yml', 'opencollection: 1.0.0\ninfo:\n  name: fixture\nbundled: false\n');
        json('tests/envs/local.json', { apiBaseURL: 'http://localhost:1', webBaseURL: 'http://localhost:1' });
        json('tests/tsconfig.json', { compilerOptions: { module: 'ESNext', moduleResolution: 'Bundler', target: 'ES2022', noEmit: true, types: ['node'], skipLibCheck: true }, include: ['api/**/*.ts', 'e2e/**/*.ts', 'support/**/*.ts', 'playwright.config.ts'] });
        write('tests/playwright.config.ts', `import {defineConfig} from '@playwright/test'; export default defineConfig({testDir:'.', outputDir:process.env.TEST_FLOW_ARTIFACT_DIR ? process.env.TEST_FLOW_ARTIFACT_DIR+'/results' : 'test-results', reporter:[['json',{outputFile:process.env.TEST_FLOW_ARTIFACT_DIR ? process.env.TEST_FLOW_ARTIFACT_DIR+'/results.json' : undefined}]],projects:[{name:'api'}]});`);
        const flow = { version: 1, id: 'fixture/read', title: 'CLI fixture', runner: 'playwright', project: 'api', entry: 'api/read.spec.ts',
            kind: 'read-only', envs: ['local'], tags: ['fixture'], expectedCases: 1, params: [], preconditions: ['offline'], verification: ['assertion'],
            limitations: ['fixture'], cleanup: 'none', steps: [], inputs: [], evidence: { requiredAttachments: ['state'] } };
        json('tests/api/flow.json', flow);
        write('tests/api/plan.md', '# Plan');
        json('tests/registry.json', { version: 1, flows: ['api/flow.json'] });
        write('tests/api/read.spec.ts', `import {test,expect} from '@playwright/test';import{writeFile}from'node:fs/promises';test('fixture',async({},info)=>{const file=info.outputPath('state.json');await writeFile(file,'{}');await info.attach('state',{path:file,contentType:'application/json'});expect(1).toBe(1);});`);
        const cli = (...args) => spawnSync(process.execPath, ['tests/framework/cli.mjs', ...args], { cwd: repo, encoding: 'utf8', timeout: 30000 });
        const records = () => {
            const dir = path.join(repo, 'tests/.artifacts/runs');
            return fs.existsSync(dir) ? fs.readdirSync(dir).map((name) => ({ directory: path.join(dir, name), ...JSON.parse(fs.readFileSync(path.join(dir, name, 'run.json'))) })) : [];
        };
        await run({ repo, write, json, cli, records, flow });
    } finally { fs.rmSync(repo, { recursive: true, force: true }); }
}

test('真实 CLI 成功执行、独立 verify、报告损坏、归属错误和旧摘要均正确判定', () => fixture(async ({ cli, records, write }) => {
    const run = cli('run', 'fixture/read');
    assert.equal(run.status, 0, run.stdout + run.stderr);
    const item = records()[0];
    assert.equal(item.evidenceVersion, 2);
    assert.equal(item.evidenceDigests.length, 1);
    assert.equal(cli('verify', item.runId).status, 0);
    const reportPath = path.join(item.directory, 'results.json');
    const recordPath = path.join(item.directory, 'run.json');
    const original = fs.readFileSync(reportPath, 'utf8');
    const parsed = JSON.parse(original);
    const spec = parsed.suites.flatMap((suite) => suite.specs ?? [])[0];
    const attachment = spec.tests[0].results[0].attachments[0];
    const bytes = fs.readFileSync(attachment.path);
    fs.writeFileSync(attachment.path, '{"changed":true}');
    assert.equal(cli('verify', item.runId).status, 1);
    fs.writeFileSync(attachment.path, bytes);
    spec.tests[0].projectName = 'wrong';
    fs.writeFileSync(reportPath, JSON.stringify(parsed));
    const record = JSON.parse(fs.readFileSync(recordPath));
    record.resultsHash = createHash('sha256').update(fs.readFileSync(reportPath)).digest('hex');
    fs.writeFileSync(recordPath, JSON.stringify(record));
    assert.equal(cli('verify', item.runId).status, 1);
    fs.writeFileSync(reportPath, original);
    record.resultsHash = createHash('sha256').update(original).digest('hex');
    delete record.evidenceVersion;
    fs.writeFileSync(recordPath, JSON.stringify(record));
    assert.equal(cli('verify', item.runId).status, 1);
    fs.writeFileSync(reportPath, '{broken');
    assert.equal(cli('verify', item.runId).status, 1);
    assert.equal(cli('run', 'fixture/read', '--timeout-ms', 'bad').status, 1);
    write('tests/api/read.spec.ts', `import {test} from '@playwright/test';test('never',()=>{});`);
    // 实际执行但未附必需证据也必须失败。
    assert.equal(cli('run', 'fixture/read').status, 1);
}));

test('真实 CLI 深度校验拒绝缺依赖、数量错误、TS 错误和未登记用例', () => fixture(async ({ cli, write, json, flow }) => {
    assert.equal(cli('check', '--deep').status, 0);
    json('tests/api/flow.json', { ...flow, expectedCases: 2 });
    assert.equal(cli('check', '--deep').status, 1);
    json('tests/api/flow.json', flow);
    write('tests/api/extra.spec.ts', `import {test} from '@playwright/test';test('extra',()=>{});`);
    assert.equal(cli('check', '--deep').status, 1);
    write('tests/api/extra.spec.ts', 'const broken: number = "text";');
    assert.equal(cli('check', '--deep').status, 1);
    write('tests/api/read.spec.ts', `import './missing';`);
    assert.equal(cli('check', '--deep').status, 1);
}));

test('真实 CLI 总超时保存 timed_out，SIGTERM 保存 interrupted，均退出非零', () => fixture(async ({ repo, cli, records, write }) => {
    write('tests/api/read.spec.ts', `import {test} from '@playwright/test';test('hang',async()=>{await new Promise(r=>setTimeout(r,60000));});`);
    assert.equal(cli('run', 'fixture/read', '--timeout-ms', '1000').status, 1);
    assert.equal(records()[0].status, 'timed_out');
    const child = spawn(process.execPath, ['tests/framework/cli.mjs', 'run', 'fixture/read'], { cwd: repo, stdio: 'ignore' });
    const closed = once(child, 'close');
    const deadline = Date.now() + 5000;
    while (records().length < 2 && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 20));
    assert.equal(records().length, 2);
    // run.json 写出后等待子工具启动、信号处理器就绪。
    await new Promise((resolve) => setTimeout(resolve, 150));
    child.kill('SIGTERM');
    const [code] = await closed;
    assert.equal(code, 1);
    assert.ok(records().some((item) => item.status === 'interrupted' && item.finishedAt));
}));

test('Bruno YAML 深度校验不执行脚本，拒绝语法、协议、数量错误及未登记请求', () => fixture(async ({ repo, write, flow }) => {
    const bru = { ...flow, runner: 'bruno', entry: 'bruno/read.yml' };
    const valid = 'info:\n  name: fixture\n  type: http\nhttp:\n  method: GET\n  url: http://localhost:1\nruntime:\n  scripts:\n    - type: tests\n      code: |-\n        throw new Error("深度校验不执行脚本");\n';
    write('tests/bruno/read.yml', valid);
    assert.doesNotThrow(() => validateBruno(path.join(repo, 'tests'), [bru]));
    for (const invalid of [
        valid.replace('throw new Error', 'throw new Error('),
        'info: [broken',
        valid.replace('method: GET', 'method: 123'),
        valid.replace('  method: GET\n', ''),
        valid.replace('type: http', 'type: graphql'),
        valid.replace('type: tests', 'type: typo'),
        valid.replace('  method: GET', '  method: GET\n  method: POST'),
    ]) {
        write('tests/bruno/read.yml', invalid);
        assert.throws(() => validateBruno(path.join(repo, 'tests'), [bru]), /深度校验失败/);
    }
    write('tests/bruno/read.yml', valid);
    assert.throws(() => validateBruno(path.join(repo, 'tests'), [{ ...bru, expectedCases: 2 }]), /深度校验失败/);
    assert.throws(() => validateBruno(path.join(repo, 'tests'), []), /深度校验失败/);
    assert.throws(() => validateBruno(path.join(repo, 'tests'), [{ ...bru, entry: 'bruno/missing.yml' }]), /深度校验失败/);
    write('tests/bruno/legacy.bru', 'meta {}');
    assert.throws(() => validateBruno(path.join(repo, 'tests'), [bru]), /仅维护 OpenCollection/);
    fs.unlinkSync(path.join(repo, 'tests/bruno/legacy.bru'));
    write('tests/bruno/unsupported.yaml', valid);
    assert.throws(() => validateBruno(path.join(repo, 'tests'), [bru]), /仅维护 OpenCollection/);
}));

test('Bruno YAML 集合、父目录和环境均检查配置及继承脚本，不执行脚本', () => fixture(async ({ repo, write }) => {
    const root = path.join(repo, 'tests');
    const collection = 'opencollection: 1.0.0\ninfo:\n  name: fixture\nrequest:\n  scripts:\n    - type: before-request\n      code: throw new Error("never run");\n';
    const folder = 'info:\n  name: domain\n  type: folder\nrequest:\n  scripts:\n    - type: after-response\n      code: throw new Error("never run");\n';
    const environment = 'name: local\nvariables:\n  - name: baseUrl\n    value: http://localhost:1\n';
    write('tests/bruno/opencollection.yml', collection);
    write('tests/bruno/domain/folder.yml', folder);
    write('tests/bruno/environments/local.yml', environment);
    assert.doesNotThrow(() => validateBruno(root, []));
    for (const [file, original, invalid] of [
        ['opencollection.yml', collection, collection.replace('code: throw new Error', 'code: throw new Error(')],
        ['opencollection.yml', collection, collection.replace('1.0.0', '9.0.0')],
        ['opencollection.yml', collection, 'info:\n  name: fixture\n'],
        ['domain/folder.yml', folder, folder.replace('code: throw new Error', 'code: throw new Error(')],
        ['domain/folder.yml', folder, folder.replace('type: folder', 'type: http')],
        ['environments/local.yml', environment, 'variables: invalid'],
        ['environments/local.yml', environment, 'name: local\nvariables: [broken'],
    ]) {
        write(`tests/bruno/${file}`, invalid);
        assert.throws(() => validateBruno(root, []), /深度校验失败/);
        write(`tests/bruno/${file}`, original);
    }
    write('tests/bruno/bruno.json', '{}');
    assert.throws(() => validateBruno(root, []), /仅维护 OpenCollection/);
}));

test('真实 CLI 缺少安装依赖时 doctor 仍可启动并报告缺失', () => fixture(async ({ repo, cli }) => {
    fs.unlinkSync(path.join(repo, 'node_modules'));
    const result = cli('doctor');
    assert.equal(result.status, 1);
    assert.match(result.stdout, /FAIL @playwright\/test/);
    assert.match(result.stdout, /FAIL typescript/);
}));

test('总超时强制回收忽略 SIGTERM 的子进程组', () => fixture(async ({ repo, write }) => {
    write('worker.mjs', `import fs from 'node:fs';process.on('SIGTERM',()=>{});fs.writeFileSync('worker.pid',String(process.pid));setInterval(()=>{},1000);`);
    write('parent.mjs', `import{spawn}from'node:child_process';spawn(process.execPath,['worker.mjs'],{stdio:'inherit'});process.on('SIGTERM',()=>{});setInterval(()=>{},1000);`);
    const result = await executeProcess([path.join(repo,'parent.mjs')], { cwd: repo, timeoutMs: 700, graceMs: 100, stdio: 'ignore' });
    assert.equal(result.status, 'timed_out');
    const worker = Number(fs.readFileSync(path.join(repo,'worker.pid'),'utf8'));
    let exists = true;
    for (let i=0; i<50; i++) {
        try { process.kill(worker,0); } catch { exists=false; break; }
        await new Promise((resolve)=>setTimeout(resolve,20));
    }
    assert.equal(exists,false);
}));

test('真实 Bruno CLI 对本地测试服务器运行并按请求路径复核', () => fixture(async ({ repo, write, json, cli, records, flow }) => {
    write('server.mjs', `import{createServer}from'node:http';const server=createServer((req,res)=>{res.writeHead(200,{'content-type':'application/json'});res.end('{"code":"0"}');});server.listen(0,'127.0.0.1',()=>process.send(server.address().port));`);
    const server = spawn(process.execPath, ['server.mjs'], { cwd: repo, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
    const closed = once(server, 'close');
    try {
        const [port] = await once(server, 'message');
        const bru = { ...flow, id: 'fixture/bruno', runner: 'bruno', entry: 'bruno/read.yml', evidence: { requiredAttachments: [] } };
        delete bru.project;
        json('tests/bruno/flow.json', bru);
        write('tests/bruno/plan.md', '# Bruno offline fixture');
        write('tests/bruno/read.yml', `info:\n  name: fixture\n  type: http\n  seq: 1\nhttp:\n  method: GET\n  url: "{{baseUrl}}/"\nruntime:\n  scripts:\n    - type: tests\n      code: |-\n        test("ok",()=>{expect(res.getStatus()).to.equal(200);expect(res.getBody().code).to.equal("0");});\n`);
        json('tests/envs/local.json', { apiBaseURL: `http://127.0.0.1:${port}`, webBaseURL: `http://127.0.0.1:${port}` });
        json('tests/registry.json', { version: 1, flows: ['api/flow.json', 'bruno/flow.json'] });
        const result = cli('run','fixture/bruno');
        assert.equal(result.status,0,result.stdout+result.stderr);
        assert.equal(cli('verify',records()[0].runId).status,0);
        write('tests/bruno/environments/local.yml', `name: local\nvariables:\n  - name: baseUrl\n    value: http://127.0.0.1:${port}\n`);
        const native = spawnSync(process.execPath, [path.join(repo, 'node_modules/@usebruno/cli/bin/bru.js'), 'run', '--env', 'local'],
            { cwd: path.join(repo, 'tests/bruno'), encoding: 'utf8', timeout: 30000 });
        assert.equal(native.status,0,native.stdout+native.stderr);
        // 新建 Bruno 流程只能生成 YAML，且模板必须真的失败。
        assert.equal(cli('init','fixture/new','--runner','bruno','--dry-run').status,0);
        assert.equal(fs.existsSync(path.join(repo,'tests/bruno/fixture/new')),false);
        assert.equal(cli('init','fixture/new','--runner','bruno').status,0);
        assert.ok(fs.existsSync(path.join(repo,'tests/bruno/fixture/new/request.yml')));
        const checked = cli('check','--deep');
        assert.equal(checked.status,0,checked.stdout+checked.stderr);
        const template = cli('run','fixture/new');
        assert.equal(template.status,1,template.stdout+template.stderr);
        assert.match(template.stdout,/模板不能直接算通过/);
    } finally { server.kill('SIGTERM'); await closed; }
}));

test('init/step 脚手架：dry-run 不落盘、模板实际失败、冲突拒绝且索引不重复', () => fixture(async ({ repo, cli }) => {
    assert.equal(cli('session','login','--dry-run').status,1); // 不允许忽略 dry-run 后创建真实会话。
    assert.equal(cli('init','demo/scaffold','--project','api','--dry-run').status,0);
    const directory = path.join(repo,'tests/api/demo/scaffold');
    assert.equal(fs.existsSync(directory),false);
    assert.equal(cli('init','demo/scaffold','--project','api','--title','示例').status,0);
    const checked = cli('check','--deep');
    assert.equal(checked.status,0,checked.stdout+checked.stderr);
    const run = cli('run','demo/scaffold');
    assert.equal(run.status,1);
    assert.match(run.stdout,/TODO/);
    assert.equal(cli('init','demo/scaffold','--project','api').status,1);
    assert.equal(cli('init','demo/default','--project','api').status,0);
    assert.match(fs.readFileSync(path.join(repo,'tests/support/steps/demo/default.ts'),'utf8'),/function stepDefault/);
    assert.equal(cli('check','--deep').status,0);
    assert.equal(cli('step','new','demo/extra','--dry-run').status,0);
    assert.equal(fs.existsSync(path.join(repo,'tests/support/steps/demo/extra.ts')),false);
    assert.equal(cli('step','new','demo/extra').status,0);
    assert.equal(cli('step','new','demo/extra').status,1);
    assert.equal(cli('check').status,1); // 独立新步骤尚未引用，不能假通过。
    assert.equal(cli('init','../escape').status,1);
    fs.mkdirSync(path.join(repo,'outside'));
    fs.symlinkSync(path.join(repo,'outside'),path.join(repo,'tests/support/steps/escaped'));
    assert.equal(cli('step','new','escaped/probe','--dry-run').status,1);
    assert.equal(fs.existsSync(path.join(repo,'outside/probe.ts')),false);
}));

test('两个脚手架进程并发更新时注册表和索引均保留两次操作', () => fixture(async ({ repo, write }) => {
    write('init-worker.mjs', `import fs from 'node:fs';import path from 'node:path';import{initFlow}from'./tests/framework/scaffold.mjs';const root=path.join(process.cwd(),'tests');const read=fs.readFileSync;fs.readFileSync=function(file,...args){const bytes=read.call(fs,file,...args);if(String(file)===path.join(root,'registry.json'))Atomics.wait(new Int32Array(new SharedArrayBuffer(4)),0,0,250);return bytes;};initFlow(root,'parallel/'+process.argv[2],{project:'api'});`);
    const children = ['one','two'].map((name)=>spawn(process.execPath,['init-worker.mjs',name],{cwd:repo,stdio:'ignore'}));
    const results = await Promise.all(children.map((child)=>once(child,'close')));
    assert.deepEqual(results.map(([code])=>code),[0,0]);
    const registry=JSON.parse(fs.readFileSync(path.join(repo,'tests/registry.json')));
    assert.equal(registry.flows.length,3);
    const index=fs.readFileSync(path.join(repo,'tests/support/steps/INDEX.md'),'utf8');
    assert.match(index,/parallel\/one.ts/);assert.match(index,/parallel\/two.ts/);
    assert.equal(fs.readdirSync(path.join(repo,'tests/.local/locks')).length,0);
    assert.ok(!fs.readdirSync(path.join(repo,'tests')).some((file)=>file.includes('.tmp-')));
}));

test('CLI 失败结果和运行记录提供稳定分类，保持非零退出码', () => fixture(async ({ repo, cli, records, write }) => {
    const invalid=cli('unknown');
    assert.equal(invalid.status,1);
    const error=JSON.parse(invalid.stderr.trim());
    assert.equal(error.failureKind,'CONFIG');
    assert.equal(error.ok,false);
    write('tests/api/read.spec.ts', `import{test}from'@playwright/test';test('hang',async()=>{await new Promise(r=>setTimeout(r,60000));});`);
    assert.equal(cli('run','fixture/read','--timeout-ms','300').status,1);
    const record=records()[0];
    assert.equal(record.failureKind,'TIMEOUT');
    assert.equal(JSON.parse(fs.readFileSync(path.join(record.directory,'verification.json'))).failureKind,'TIMEOUT');
}));

test('注册表写入失败会回滚本次文件与索引，并释放锁', () => fixture(async ({ repo, write }) => {
    const originalIndex = fs.readFileSync(path.join(repo,'tests/support/steps/INDEX.md'),'utf8');
    write('init-failure.mjs', `import fs from'node:fs';import path from'node:path';import{initFlow}from'./tests/framework/scaffold.mjs';const rename=fs.renameSync;fs.renameSync=function(from,to){if(String(to).endsWith('registry.json'))throw Object.assign(new Error('simulated disk failure'),{code:'EIO'});return rename.call(fs,from,to);};try{initFlow(path.join(process.cwd(),'tests'),'fault/read',{project:'api'});process.exitCode=2;}catch{process.exitCode=1;}`);
    const result=spawnSync(process.execPath,['init-failure.mjs'],{cwd:repo,encoding:'utf8'});
    assert.equal(result.status,1);
    assert.equal(JSON.parse(fs.readFileSync(path.join(repo,'tests/registry.json'))).flows.length,1);
    assert.equal(fs.readFileSync(path.join(repo,'tests/support/steps/INDEX.md'),'utf8'),originalIndex);
    assert.equal(fs.existsSync(path.join(repo,'tests/support/steps/fault/read.ts')),false);
    assert.equal(fs.existsSync(path.join(repo,'tests/api/fault/read')),false);
    assert.equal(fs.readdirSync(path.join(repo,'tests/.local/locks')).length,0);
    assert.ok(!fs.readdirSync(path.join(repo,'tests')).some((file)=>file.includes('.tmp-')));
}));
