import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readJson, writeJson, digest, inside, loadFlows, resolveExecution, flowHash, verifyReport, captureEvidence } from "./core.mjs";
import { initFlow, newStep } from "./scaffold.mjs";
import { saveSession, checkSession, clearSession, recoverSessions } from "./session.mjs";
import { validateBruno } from "./bruno.mjs";
import { executeProcess } from "./process.mjs";
import { checkDiscovery, probeService } from "./inspect.mjs";
import { removeFlow } from "./maintenance.mjs";
import { runBatch } from "./batch.mjs";
import { runHistory, statistics, feedbackList, recordFeedback, lintFlows } from "./catalog.mjs";
import { loginWindow } from "./browser.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repository = path.dirname(root);
const runs = path.join(root, '.artifacts/runs');
const require = createRequire(import.meta.url);
const usage = `weiran4j 测试工作流：
  pnpm test:flows list [关键词] [--runner playwright|bruno] [--project api|e2e] [--tag smoke] [--step 路径] [--portal admin] [--json]
  pnpm test:flows show <domain/name>
  pnpm test:flows check [--deep] [--json]
  pnpm test:flows doctor [--env local]
  pnpm test:flows init <domain/name> [--runner playwright|bruno] [--project api|e2e] [--title 标题] [--dry-run]
  pnpm test:flows step new <domain/name> [--dry-run]
  pnpm test:flows remove <domain/name> [--dry-run | --yes]
  pnpm test:flows run <domain/name> --env local [--headed | --headless | --ui] [--dry-run]
  pnpm test:flows run --tag smoke --env local
  pnpm test:flows verify <runId>
  pnpm test:flows history [--flow id] [--env local]
  pnpm test:flows stats [id] [--env local]
  pnpm test:flows feedback <id> --verdict useful|stale|wrong --run-id <runId> [--note 说明]
  pnpm test:flows feedback --list [--flow id] [--env local]
  pnpm test:flows report <runId>
  pnpm test:flows session login|check|clear|recover --env local --role admin
人工登录：session login --manual [--portal admin]；自动登录默认读取所选角色的本地凭据。
会话复用：run <id> --env local --role admin；不指定 role 时不复用缓存。
运行参数：--api-base-url URL / --web-base-url URL / --param NAME=VALUE
执行总超时：--timeout-ms 正整数（默认 120000）；SIGINT/SIGTERM 取消并保留失败记录。
凭据优先用进程环境 FLOW_<NAME> 提供；运行记录只保存参数名。
严格复核：跳过、flaky、断言降级或证据缺失均失败。批次摘要明确记录阻塞和未执行范围。`;

function parse(argv) {
    const positional = [];
    const flags = {};
    const params = {};
    const boolean = ['headed', 'headless', 'ui', 'dry-run', 'deep', 'json', 'yes', 'list', 'manual'];
    const valued = ['runner', 'tag', 'env', 'api-base-url', 'web-base-url', 'timeout-ms', 'param', 'role', 'title', 'project', 'portal', 'step', 'flow', 'verdict', 'run-id', 'note'];
    for (let i = 0; i < argv.length; i++) {
        const token = argv[i];
        if (!token.startsWith('--')) { positional.push(token); continue; }
        const index = token.indexOf('=');
        const key = token.slice(2, index < 0 ? undefined : index);
        if (boolean.includes(key)) {
            if (index >= 0) throw new Error(`--${key} 不接受值`);
            flags[key] = true;
            continue;
        }
        if (!valued.includes(key)) throw new Error(`未知选项：--${key}`);
        const value = index < 0 ? argv[++i] : token.slice(index + 1);
        if (!value || value.startsWith('--')) throw new Error(`--${key} 缺少值`);
        if (key === 'param') {
            const separator = value.indexOf('=');
            if (separator < 1) throw new Error('--param 格式必须为 NAME=VALUE');
            const name = value.slice(0, separator);
            if (!/^[A-Z][A-Z0-9_]*$/.test(name)) throw new Error('参数名必须为大写字母、数字或下划线');
            if (Object.hasOwn(params, name)) throw new Error('参数不能重复声明');
            params[name] = value.slice(separator + 1);
        } else {
            if (Object.hasOwn(flags, key)) throw new Error(`--${key} 不能重复声明`);
            flags[key] = value;
        }
    }
    return { positional, flags, params };
}

function select(flows, id, flags) {
    const result = flows.filter((flow) => (!id || flow.id === id)
        && (!flags.runner || flow.runner === flags.runner)
        && (!flags.project || flow.project === flags.project)
        && (!flags.tag || flow.tags.includes(flags.tag))
        && (!flags.env || flow.envs.includes(flags.env)));
    if (!result.length) throw new Error('没有匹配的流程；请运行 list 查看定义及支持环境');
    return result;
}

function tool(name) {
    const manifest = require.resolve(`${name}/package.json`);
    const meta = readJson(manifest);
    const bin = Object.values(meta.bin)[0];
    return { bin: path.resolve(path.dirname(manifest), bin), version: meta.version };
}

function commandFor(flow, environment, directory, flags) {
    if (flow.runner === 'playwright') {
        const executable = tool('@playwright/test');
        const args = [executable.bin, 'test', `tests/${flow.entry}`.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$', '--config', path.join(root, 'playwright.config.ts'),
            '--project', flow.project, '--workers=1'];
        if (flags.ui) args.push('--ui');
        else if (flags.headed || (flow.project === 'e2e' && !flags.headless && !process.env.CI)) args.push('--headed');
        return { args, cwd: repository, version: executable.version };
    }
    if (flags.headed || flags.headless || flags.ui) throw new Error('浏览器运行模式只适用于 Playwright');
    const executable = tool('@usebruno/cli');
    return { args: [executable.bin, 'run', path.relative('bruno', flow.entry),
        '--env-var', `baseUrl=${environment.apiBaseURL}`, '--reporter-json', path.join(directory, 'results.json'),
        '--reporter-skip-all-headers', '--reporter-skip-body'], cwd: path.join(root, 'bruno'), version: executable.version };
}

function verify(runId, print = true, initial = false) {
    if (!/^\d{17}-[a-f0-9]{8}$/.test(runId ?? '')) throw new Error('runId 格式无效');
    const directory = inside(runs, runId);
    const record = readJson(inside(directory, 'run.json'));
    if (record.runId !== runId || !['playwright', 'bruno'].includes(record.flow?.runner)) throw new Error('运行记录无效');
    const issues = [];
    if (!initial) {
        try {
            const original = readJson(inside(directory, 'verification.json'));
            if (original.runId !== runId || original.flowId !== record.flow.id || original.ok !== true || original.complete !== true) {
                issues.push('首次执行未完整通过，需重新执行流程');
            }
        } catch { issues.push('首次验证结果缺失或损坏，需重新执行流程'); }
    }
    let result = { ok: false, cases: 0, issues: [] };
    try {
        const file = inside(directory, 'results.json');
        if (!record.resultsHash || digest(fs.readFileSync(file)) !== record.resultsHash) issues.push('原生报告缺少校验值或内容已改变');
        result = verifyReport(record, readJson(file), directory);
    } catch {
        issues.push('原生报告缺失、损坏或格式无效');
    }
    const warnings = [];
    try {
        const current = loadFlows(root).find((flow) => flow.id === record.flow.id);
        if (!current || flowHash(root, current) !== record.flowHash) warnings.push('当前流程或共享依赖与本次运行版本不同；本结论仅对应记录的版本');
    } catch { warnings.push('当前定义不可用；按运行时快照复核历史证据'); }
    const outcomeKind = { timed_out: 'TIMEOUT', interrupted: 'INTERRUPTED', failed: 'EXECUTION', running: 'EXECUTION' }[record.status]
        ?? result.failureKind ?? 'VERIFICATION';
    const verification = { runId, flowId: record.flow.id, verifiedAt: new Date().toISOString(),
        ok: result.ok && issues.length === 0, complete: result.complete === true && issues.length === 0,
        failureKind: result.ok && !issues.length ? null : outcomeKind, cases: result.cases, issues: [...issues, ...result.issues], warnings };
    if (initial) {
        fs.writeFileSync(path.join(directory, 'verification.json'), JSON.stringify(verification, null, 2) + '\n', { flag: 'wx' });
    } else {
        // 复核只更新独立结果，不改原始执行结论。
        writeJson(path.join(directory, 'reverification.json'), verification);
    }
    if (print) console.log(JSON.stringify(verification, null, 2));
    return verification;
}

function prepare(flow, flags, params) {
    if (flow.blockedReason) throw Object.assign(new Error(`${flow.id} 暂不可运行：${flow.blockedReason}`), { code: 'ENVIRONMENT' });
    const envName = flags.env ?? 'local';
    if (!flow.envs.includes(envName)) throw new Error(`${flow.id} 不支持环境 ${envName}`);
    if (!/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(envName)) throw new Error('环境名无效');
    const profile = readJson(inside(root, `envs/${envName}.json`));
    const { environment, values, portal } = resolveExecution(flow, profile, flags, params);
    const runId = `${new Date().toISOString().replace(/\D/g, '')}-${randomUUID().slice(0, 8)}`;
    const directory = path.join(runs, runId);
    const command = commandFor(flow, environment, directory, flags);
    if (flags.role && (flow.runner !== 'playwright' || flow.project !== 'e2e')) throw new Error('登录态复用仅用于浏览器流程');
    if (flags.role && flow.tags.includes('authenticated')) throw new Error('登录测试本身不能跳过登录；请用于显式支持复用的业务流程');
    return { envName, environment, values, portal, runId, directory, command };
}

async function run(flow, flags, execution) {
    const { envName, environment, values, portal, runId, directory, command } = execution;
    if (flags['dry-run']) {
        // 不打印参数值，也不将参数值拼入命令。Bruno 用 {{process.env.FLOW_NAME}} 引用声明参数。
        console.log(JSON.stringify({ flowId: flow.id, environment: envName, addresses: environment,
            portal, executable: process.execPath, args: command.args, cwd: command.cwd, paramNames: Object.keys(values) }, null, 2));
        return { ok: true };
    }
    const env = { ...process.env, TEST_API_BASE_URL: environment.apiBaseURL, TEST_WEB_BASE_URL: environment.webBaseURL,
        TEST_FLOW_ARTIFACT_DIR: directory, TEST_FLOW_ENV: envName };
    delete env.TEST_SESSION_ROLE; // 只有显式选择的业务流程能复用登录态。
    Object.assign(env, { FLOW_LOGIN_PATH: portal.loginPath, FLOW_HOME_PATH: portal.homePath, FLOW_LOGIN_MODE: portal.loginMode, FLOW_PORTAL: portal.name });
    if (flags.role) {
        const role = flags.role ?? 'admin';
        await checkSession(root, envName, role, environment);
        env.TEST_SESSION_ROLE = role;
    }
    for (const [name, value] of Object.entries(values)) env[`FLOW_${name}`] = value;
    const record = { runId, startedAt: new Date().toISOString(), status: 'running', exitCode: null,
        flow, flowHash: flowHash(root, flow), environment: envName, addresses: environment, portal: portal.name,
        evidenceVersion: 2, evidenceDigests: [], timeoutMs: Number(flags['timeout-ms'] ?? 120000),
        paramNames: Object.keys(values), nodeVersion: process.version, toolVersion: command.version };
    writeJson(path.join(directory, 'run.json'), record);
    const start = Date.now();
    const result = await executeProcess(command.args, { cwd: command.cwd, env, timeoutMs: record.timeoutMs });
    record.exitCode = result.exitCode;
    record.signal = result.signal ?? null;
    record.status = result.status;
    record.error = result.error;
    if (['interrupted', 'timed_out'].includes(result.status)) stopRequested = true;
    record.durationMs = Date.now() - start;
    record.finishedAt = new Date().toISOString();
    const report = path.join(directory, 'results.json');
    record.resultsHash = fs.existsSync(report) ? digest(fs.readFileSync(report)) : null;
    try { record.evidenceDigests = captureEvidence(flow, readJson(report), directory); }
    catch { record.evidenceDigests = []; }
    writeJson(path.join(directory, 'run.json'), record);
    const checked = verify(runId, true, true);
    record.failureKind = checked.failureKind;
    writeJson(path.join(directory, 'run.json'), record);
    console.log(`runId=${runId}\nartifactDir=${directory}\nverify: pnpm test:flows verify ${runId}`);
    return { ok: checked.ok, failureKind: checked.failureKind };
}

function deepValidate(flows, quiet = false) {
    validateBruno(root, flows);
    const compiler = tool('typescript');
    // TypeScript 的第一个 bin 为 tsc。
    const typed = spawnSync(process.execPath, [compiler.bin, '--project', path.join(root, 'tsconfig.json')],
        { cwd: repository, encoding: 'utf8', timeout: 60_000 });
    if (typed.status !== 0) throw new Error(`TypeScript 检查失败\n${typed.stdout ?? ''}${typed.stderr ?? ''}`);
    const executable = tool('@playwright/test');
    const discovered = spawnSync(process.execPath, [executable.bin, 'test', '--list', '--reporter=json',
        '--config', path.join(root, 'playwright.config.ts')],
        { cwd: repository, encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    if (discovered.status !== 0) throw new Error(`Playwright 用例发现失败\n${discovered.stderr ?? ''}`);
    let report;
    try { report = JSON.parse(discovered.stdout); }
    catch { throw new Error('Playwright 用例发现未返回有效 JSON 报告'); }
    const issues = checkDiscovery(flows, report);
    if (issues.length) throw new Error(issues.join('\n'));
    if (!quiet) console.log('深度检查通过：TypeScript、Playwright 用例发现、注册与 expectedCases 一致，Bruno 语法及配置有效');
}

async function doctor(flags) {
    const checks = [{ name: 'node', ok: process.versions.node.split('.')[0] === '24', detail: process.version }];
    for (const name of ['@playwright/test', '@usebruno/cli', 'typescript']) {
        try { const installed = tool(name); checks.push({ name, ok: fs.existsSync(installed.bin), detail: installed.version }); }
        catch { checks.push({ name, ok: false, detail: '依赖缺失，请在根目录 pnpm install --frozen-lockfile' }); }
    }
    try {
        const { chromium } = require('@playwright/test');
        const channel = process.env.TEST_BROWSER_CHANNEL;
        const systemPaths = {
            darwin: { chrome: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', msedge: '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge' },
            linux: { chrome: '/opt/google/chrome/chrome', msedge: '/opt/microsoft/msedge/msedge' },
            win32: { chrome: path.join(process.env.PROGRAMFILES ?? '', 'Google/Chrome/Application/chrome.exe'), msedge: path.join(process.env['PROGRAMFILES(X86)'] ?? '', 'Microsoft/Edge/Application/msedge.exe') },
        };
        const file = !channel || channel === 'chromium' ? chromium.executablePath() : systemPaths[process.platform]?.[channel];
        checks.push({ name: 'browser', ok: Boolean(file && fs.existsSync(file)), detail: !file
            ? `无法静态诊断浏览器 channel=${channel}；doctor 支持 Chromium、chrome、msedge`
            : fs.existsSync(file) ? `已安装 ${channel ?? 'Chromium'}（未验证 headless shell 或启动权限）`
            : `浏览器缺失：${channel ?? '运行 pnpm exec playwright install chromium'}` });
    } catch { checks.push({ name: 'browser', ok: false, detail: '浏览器配置无法解析，请检查 Playwright 安装与 TEST_BROWSER_CHANNEL' }); }
    try {
        const flows = loadFlows(root);
        checks.push({ name: 'registry', ok: true, detail: `${flows.length} 个流程，步骤声明与索引有效` });
    } catch (error) { checks.push({ name: 'registry', ok: false, detail: error.message }); }
    try {
        const envName = flags.env ?? 'local';
        if (!/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(envName)) throw new Error('环境名无效');
        const profile = readJson(inside(root, `envs/${envName}.json`));
        const { environment: addresses } = resolveExecution({ params: [] }, profile, flags, {});
        checks.push(...await Promise.all([
            probeService('api', addresses.apiBaseURL, '/api-backend/system/auth/getCurrentUser',
                (status, body) => status === 401 && body?.code === 100101 && body?.data === null),
            probeService('health', addresses.apiBaseURL, '/api-backend/n/health',
                (status, body) => status === 200 && body?.code === 0 && body?.data?.status === 'UP'),
            probeService('manage', addresses.webBaseURL, '/', (status) => status === 200),
        ]));
    } catch (error) { checks.push({ name: 'environment', ok: false, detail: error.message }); }
    if (flags.json) console.log(JSON.stringify({ ok: checks.every((check) => check.ok), checks }));
    else {
        for (const check of checks) console.log(`${check.ok ? 'OK' : 'FAIL'} ${check.name}${check.status ? ` HTTP ${check.status}` : ''}: ${check.detail}`);
        console.log('doctor 仅检查安装、配置与只读服务响应，不代表浏览器启动或业务测试通过。');
    }
    process.exitCode = checks.every((check) => check.ok) ? 0 : 1;
}

let stopRequested = false;

async function main() {
    const { positional, flags, params } = parse(process.argv.slice(2));
    const [action = 'help', id] = positional;
    const addresses = ['api-base-url', 'web-base-url'];
    const accepted = {
        help: [], list: ['runner', 'tag', 'env', 'portal', 'step', 'json', 'project'], show: ['env', 'json'], check: ['deep', 'json'],
        doctor: ['env', ...addresses, 'portal', 'json'], history: ['flow', 'env', 'json'], verify: ['json'],
        run: ['runner', 'project', 'tag', 'env', ...addresses, 'portal', 'headed', 'headless', 'ui', 'dry-run', 'timeout-ms', 'role'],
        session: ['env', 'role', ...addresses, 'manual', 'portal', 'timeout-ms'], init: ['runner', 'project', 'title', 'dry-run'], step: ['dry-run'],
        remove: ['dry-run', 'yes', 'json'], stats: ['env', 'json'], feedback: ['list', 'flow', 'env', 'verdict', 'run-id', 'note', 'json'],
        report: ['dry-run', 'timeout-ms'],
    }[action];
    if (!accepted) throw new Error(`未知命令：${action}`);
    if (Object.keys(flags).some((key) => !accepted.includes(key))) throw new Error('当前命令不支持该选项，请查看 help');
    if (action !== 'run' && Object.keys(params).length) throw new Error('--param 只适用于 run');
    if (flags.runner && !['playwright', 'bruno'].includes(flags.runner)) throw new Error('runner 必须为 playwright/bruno');
    if (flags.project && !['api', 'e2e'].includes(flags.project)) throw new Error('project 必须为 api/e2e');
    if (flags.role && !/^[a-z][a-z0-9-]*$/.test(flags.role)) throw new Error('role 格式无效');
    if (action === 'step') {
        if (id !== 'new' || positional.length !== 3) throw new Error('用法：step new domain/name');
        console.log(JSON.stringify(newStep(root, positional[2], flags['dry-run']), null, 2)); return;
    }
    if (positional.length > 2) throw new Error('多余的位置参数');
    if ([flags.headed, flags.headless, flags.ui].filter(Boolean).length > 1) throw new Error('浏览器运行模式互斥');
    if (flags['timeout-ms'] !== undefined && (!/^[1-9]\d*$/.test(flags['timeout-ms']) || Number(flags['timeout-ms']) > 86400000)) throw new Error('--timeout-ms 必须为 1–86400000 的整数');
    if (action === 'doctor') { await doctor(flags); return; }
    if (action === 'remove') {
        console.log(JSON.stringify(removeFlow(root, id, { dryRun: flags['dry-run'], yes: flags.yes }), null, 2)); return;
    }
    if (action === 'report') {
        if (!/^\d{17}-[a-f0-9]{8}$/.test(id ?? '')) throw new Error('report 需要有效 runId');
        const directory = inside(runs, `${id}/report`);
        if (!fs.existsSync(path.join(directory, 'index.html'))) throw new Error('该运行没有 HTML 报告（Bruno 运行不提供 Playwright HTML）');
        inside(directory, 'index.html');
        const executable = tool('@playwright/test');
        const args = [executable.bin, 'show-report', directory, '--host', '127.0.0.1'];
        if (flags['dry-run']) console.log(JSON.stringify({ executable: process.execPath, args }));
        else {
            const result = await executeProcess(args, { cwd: repository, timeoutMs: Number(flags['timeout-ms'] ?? 1800000) });
            process.exitCode = result.status === 'passed' || result.status === 'interrupted' ? 0 : 1;
        }
        return;
    }
    if (action === 'session') {
        const operations = { login: saveSession, check: checkSession, clear: clearSession, recover: recoverSessions };
        if (!Object.hasOwn(operations, id)) throw new Error('用法：session login|check|clear|recover --env local --role admin');
        if (id !== 'login' && (flags.manual || flags.portal || flags['timeout-ms'])) throw new Error('manual/portal/timeout-ms 只适用于 session login');
        if (flags['timeout-ms'] && !flags.manual) throw new Error('session timeout-ms 只适用于人工登录');
        if (flags.portal && !flags.manual) throw new Error('portal 只适用于人工页面登录；自动登录直接使用 API');
        const environment = flags.env ?? 'local';
        if (!/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(environment)) throw new Error('环境名无效');
        if (flags.manual) {
            console.log('请在弹出的窗口完成 weiran4j 登录；成功后核验并保存受保护会话，不录制认证过程。');
            await loginWindow(root, environment, flags.role ?? 'admin', flags);
        } else {
            const profile = readJson(inside(root, `envs/${environment}.json`));
            const { environment: addresses } = resolveExecution({ params: [] }, profile, flags);
            const result = await operations[id](root, environment, flags.role ?? 'admin', addresses);
            if (id === 'recover') console.log(JSON.stringify({ ok: true, recovered: result.recovered }));
        }
        console.log(`OK: session ${id}，环境和身份已核对（不输出登录态内容）`); return;
    }
    if (action === 'help') { console.log(usage); return; }
    if (action === 'verify') { process.exitCode = verify(id).ok ? 0 : 1; return; }
    if (action === 'history' || action === 'stats') {
        const filters = { id: flags.flow ?? id, env: flags.env };
        console.log(JSON.stringify(action === 'history' ? runHistory(root, filters).slice(0, 20) : statistics(root, filters), null, 2)); return;
    }
    if (action === 'feedback' && flags.list) {
        console.log(JSON.stringify(feedbackList(root, { id: flags.flow ?? id, env: flags.env, verdict: flags.verdict, runId: flags['run-id'] }), null, 2)); return;
    }
    if (action === 'init') {
        console.log(JSON.stringify(initFlow(root, id, { runner: flags.runner, project: flags.project, title: flags.title, dryRun: flags['dry-run'] }), null, 2)); return;
    }
    const flows = loadFlows(root);
    if (action === 'feedback') {
        // useful 反馈绑定当下重新复核的结果，避免旧的通过标记掩盖证据损坏。
        if (flags.verdict === 'useful' && !verify(flags['run-id'], false).complete) throw new Error('useful 反馈要求当前完整复核通过');
        console.log(JSON.stringify(recordFeedback(root, flows, id, { verdict: flags.verdict, runId: flags['run-id'], note: flags.note, env: flags.env }), null, 2)); return;
    }
    if (action === 'check') {
        for (const flow of flows) {
            for (const name of flow.envs) {
                const profile = readJson(inside(root, `envs/${name}.json`));
                resolveExecution({ ...flow, params: [] }, profile, {}, {}, {});
            }
            flowHash(root, flow);
        }
        const issues = lintFlows(root, flows);
        if (issues.length) throw new Error(issues.map((item) => `${item.flowId}: ${item.message}`).join('\n'));
        if (flags.deep) deepValidate(flows, flags.json);
        if (flags.json) console.log(JSON.stringify({ ok: true, flows: flows.length, deep: Boolean(flags.deep), issues }));
        else console.log(`OK: ${flows.length} 个流程，注册表、文件、环境、参数与证据定义有效`);
        return;
    }
    if (action === 'show') {
        if (!id) throw new Error('show 需要流程 id');
        const flow = select(flows, id, flags)[0];
        console.log(JSON.stringify({ ...flow, command: `pnpm test:flows run ${flow.id} --env ${flow.envs[0]}` }, null, 2));
        return;
    }
    if (action === 'list') {
        const query = id?.toLowerCase();
        const result = flows.filter((flow) => (!query || [flow.id, flow.title, flow.businessProject ?? 'weiran4j', ...flow.tags].join(' ').toLowerCase().includes(query))
            && (!flags.runner || flow.runner === flags.runner)
            && (!flags.project || flow.project === flags.project) && (!flags.env || flow.envs.includes(flags.env)) && (!flags.tag || flow.tags.includes(flags.tag))
            && (!flags.portal || (flow.portal ?? 'admin') === flags.portal) && (!flags.step || flow.steps.some((step) => step === flags.step || step === `support/steps/${flags.step.replace(/\.ts$/, '')}.ts`)));
        if (flags.json) console.log(JSON.stringify(result, null, 2));
        else for (const flow of result) console.log(`${flow.id}\t${flow.runner}\t${flow.kind}\t${flow.title}\t[${flow.tags.join(',')}]${flow.blockedReason ? `\t阻塞：${flow.blockedReason}` : ''}`);
        return;
    }
    if (action === 'run') {
        if (!id && !flags.tag && !flags.runner && !flags.project) throw new Error('run 需要流程 id，或 --tag/--runner/--project 筛选');
        const selected = select(flows, id, flags);
        const batch = await runBatch(root, selected, { environment: flags.env ?? 'local', prepare: (flow) => prepare(flow, flags, params),
            run: (flow, execution) => run(flow, flags, execution), dryRun: Boolean(flags['dry-run']), shouldStop: () => stopRequested });
        console.log(JSON.stringify(batch, null, 2));
        process.exitCode = batch.ok ? 0 : 1;
        return;
    }
    throw new Error(`未知命令：${action}`);
}

try { await main(); }
catch (error) {
    const known = ['CONFIG', 'ENVIRONMENT', 'CONFLICT', 'CLEANUP', 'INTERRUPTED'];
    console.error(JSON.stringify({ ok: false, failureKind: known.includes(error.code) ? error.code : 'CONFIG',
        message: error.message, ...(error.failures ? { failures: error.failures } : {}) }));
    process.exitCode = 1;
}
