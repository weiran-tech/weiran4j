import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { brunoConfigFiles } from "./bruno.mjs";
import { dependencyGraph, inspectSteps } from "./inspect.mjs";

export const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
export const digest = (data) => createHash('sha256').update(data).digest('hex');
export function writeJson(file, data) {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.tmp-${process.pid}`;
    fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
    fs.renameSync(temporary, file);
}

function requireCondition(condition, message) {
    if (!condition) throw new Error(message);
}

export function inside(root, relative) {
    requireCondition(typeof relative === 'string' && relative.length > 0 && !path.isAbsolute(relative), '路径必须为非空相对路径');
    const target = path.resolve(root, relative);
    const inRoot = (file) => file.startsWith(`${fs.realpathSync(root)}${path.sep}`);
    requireCondition(target.startsWith(`${path.resolve(root)}${path.sep}`), `路径越界：${relative}`);
    requireCondition(fs.existsSync(target) && inRoot(fs.realpathSync(target)), `路径不存在或链接越界：${relative}`);
    return target;
}

function text(value, name) {
    requireCondition(typeof value === 'string' && value.trim().length > 0, `${name} 必须是非空字符串`);
}

function strings(value, name, nonempty = false) {
    requireCondition(Array.isArray(value) && (!nonempty || value.length > 0), `${name} 必须是数组${nonempty ? '且不能为空' : ''}`);
    value.forEach((item) => text(item, name));
    requireCondition(new Set(value).size === value.length, `${name} 不能包含重复项`);
}

export function validateFlow(meta, root, manifest) {
    requireCondition(meta && typeof meta === 'object' && !Array.isArray(meta), 'flow.json 必须是对象');
    const allowed = ['version', 'id', 'title', 'runner', 'project', 'entry', 'kind', 'envs', 'tags',
        'expectedCases', 'params', 'preconditions', 'verification', 'limitations', 'steps', 'inputs', 'cleanup', 'evidence', 'businessProject', 'portal', 'modularityNote', 'blockedReason'];
    requireCondition(Object.keys(meta).every((key) => allowed.includes(key)), 'flow.json 存在未知字段');
    requireCondition(meta.version === 1, '流程 version 必须为 1');
    requireCondition(meta.businessProject === undefined || meta.businessProject === 'weiran4j', '本仓库只维护 weiran4j 项目流程');
    requireCondition(meta.portal === undefined || /^[a-z][a-z0-9-]*$/.test(meta.portal), 'portal 无效');
    if (meta.modularityNote !== undefined) text(meta.modularityNote, 'modularityNote');
    if (meta.blockedReason !== undefined) text(meta.blockedReason, 'blockedReason');
    requireCondition(/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(meta.id), '流程 id 必须为 domain/name');
    text(meta.title, 'title');
    requireCondition(['playwright', 'bruno'].includes(meta.runner), 'runner 必须为 playwright 或 bruno');
    requireCondition(['read-only', 'transition'].includes(meta.kind), 'kind 必须为 read-only 或 transition');
    requireCondition(Number.isSafeInteger(meta.expectedCases) && meta.expectedCases > 0, 'expectedCases 必须为正整数');
    for (const name of ['envs', 'preconditions', 'verification', 'limitations']) strings(meta[name], name, true);
    for (const name of ['tags', 'steps', 'inputs']) strings(meta[name], name);
    meta.envs.forEach((env) => requireCondition(/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(env), '环境名格式无效'));
    text(meta.cleanup, 'cleanup');
    const entry = inside(root, meta.entry);
    requireCondition(fs.statSync(entry).isFile(), 'entry 必须为文件');
    requireCondition(path.dirname(entry) === path.dirname(inside(root, manifest)), 'entry 与 flow.json 必须在同一目录');
    const plan = inside(root, `${path.dirname(manifest)}/plan.md`);
    requireCondition(fs.statSync(plan).isFile() && fs.statSync(plan).size > 0, 'plan.md 必须是非空文件');
    if (meta.runner === 'playwright') {
        requireCondition(['api', 'e2e'].includes(meta.project), 'Playwright 流程必须声明 api/e2e project');
        requireCondition(meta.entry.startsWith(`${meta.project}/`) && meta.entry.endsWith('.spec.ts'), 'Playwright entry 与 project 不匹配');
    } else {
        requireCondition(!meta.project && meta.entry.startsWith('bruno/') && meta.entry.endsWith('.yml'), 'Bruno entry 必须为 .yml 且不能声明 project');
    }
    for (const item of [...meta.steps, ...meta.inputs]) {
        requireCondition(fs.statSync(inside(root, item)).isFile(), 'steps/inputs 必须引用文件');
    }
    for (const step of meta.steps) {
        requireCondition(step.startsWith('support/steps/') && step.endsWith('.ts'), '共享步骤应位于 support/steps/');
    }
    requireCondition(Array.isArray(meta.params), 'params 必须是数组');
    const names = new Set();
    for (const param of meta.params) {
        requireCondition(param && typeof param === 'object' && /^[A-Z][A-Z0-9_]*$/.test(param.name), '参数名必须为大写字母、数字或下划线');
        requireCondition(Object.keys(param).every((key) => ['name', 'description', 'required', 'secret', 'default'].includes(key)), 'params 存在未知字段');
        requireCondition(!names.has(param.name), '参数名重复');
        names.add(param.name);
        text(param.description, '参数 description');
        requireCondition(param.required === undefined || typeof param.required === 'boolean', 'required 必须为布尔值');
        requireCondition(param.secret === undefined || typeof param.secret === 'boolean', 'secret 必须为布尔值');
        requireCondition(param.default === undefined || typeof param.default === 'string', 'default 必须为字符串');
        requireCondition(!param.secret || param.default === undefined, '秘密参数不能提供默认值');
    }
    requireCondition(meta.evidence && typeof meta.evidence === 'object' && !Array.isArray(meta.evidence), '必须声明 evidence');
    requireCondition(Object.keys(meta.evidence).every((key) => key === 'requiredAttachments'), 'evidence 只支持 requiredAttachments；不放行 skipped/flaky');
    strings(meta.evidence.requiredAttachments, 'requiredAttachments');
    if (meta.kind === 'transition') {
        requireCondition(meta.runner === 'playwright', '写入流程使用 Playwright，以保存变化前后及清理证据');
        const required = ['before-state', 'after-state', 'cleanup-state'];
        if (meta.project === 'e2e') required.push('before-screenshot', 'after-screenshot');
        requireCondition(required.every((name) => meta.evidence.requiredAttachments.includes(name)), 'transition 缺少状态变化及清理证据定义');
    }
    return { ...meta, manifest, plan: `${path.dirname(manifest)}/plan.md` };
}

function discover(root, directory) {
    const result = [];
    if (!fs.existsSync(path.join(root, directory))) return result;
    for (const item of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
        const relative = `${directory}/${item.name}`;
        if (item.isDirectory()) result.push(...discover(root, relative));
        else if (item.name === 'flow.json') result.push(relative);
    }
    return result;
}

export function loadFlows(root) {
    const registry = readJson(path.join(root, 'registry.json'));
    requireCondition(registry.version === 1 && Array.isArray(registry.flows), 'registry.json 结构无效');
    strings(registry.flows, 'registry.flows', true);
    const discovered = ['api', 'e2e', 'bruno'].flatMap((dir) => discover(root, dir));
    requireCondition(discovered.length === registry.flows.length && discovered.every((file) => registry.flows.includes(file)), 'registry 与已发现的 flow.json 不一致');
    const flows = registry.flows.map((manifest) => validateFlow(readJson(inside(root, manifest)), root, manifest));
    requireCondition(new Set(flows.map((flow) => flow.id)).size === flows.length, '流程 id 重复');
    requireCondition(new Set(flows.map((flow) => flow.entry)).size === flows.length, '多个流程不能共享同一个 entry；请抽取 steps');
    const issues = inspectSteps(root, flows);
    requireCondition(!issues.length, issues.join('\n'));
    return flows;
}

export function validateBaseURL(value) {
    text(value, '服务地址');
    const url = new URL(value);
    requireCondition(['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash,
        '服务地址必须是无凭证、query 或 fragment 的 HTTP(S) URL');
    return url.href.replace(/\/$/, '');
}

export function resolveExecution(flow, profile, flags = {}, overrides = {}, inherited = process.env) {
    requireCondition(Object.keys(profile).every((key) => ['apiBaseURL', 'webBaseURL', 'portals'].includes(key)), '环境文件只保存地址与 portals 非秘密入口配置');
    const portalName = flow.portal ?? flags.portal ?? 'admin';
    requireCondition(/^[a-z][a-z0-9-]*$/.test(portalName) && (!flow.portal || !flags.portal || flow.portal === flags.portal), 'portal 与流程声明不一致或格式无效');
    requireCondition(profile.portals === undefined || (profile.portals && typeof profile.portals === 'object' && !Array.isArray(profile.portals)), 'portals 必须为对象');
    const configured = profile.portals?.[portalName];
    requireCondition(configured || portalName === 'admin', '环境未配置该 portal');
    for (const value of Object.values(profile.portals ?? {})) {
        requireCondition(value && typeof value === 'object' && !Array.isArray(value) && Object.keys(value).every((key) => ['baseURL', 'loginPath', 'homePath', 'loginMode'].includes(key)), 'portal 只保存 baseURL/loginPath/homePath/loginMode');
        if (value.baseURL !== undefined) validateBaseURL(value.baseURL);
        for (const key of ['loginPath', 'homePath']) if (value[key] !== undefined) requireCondition(typeof value[key] === 'string' && /^\/(?!\/)[^?#\\]*$/.test(value[key]), 'portal 路径必须为同源绝对路径');
        requireCondition(value.loginMode === undefined || ['password', 'manual'].includes(value.loginMode), 'loginMode 必须为 password/manual');
    }
    const portal = { name: portalName, loginPath: configured?.loginPath ?? '/login', homePath: configured?.homePath ?? '/profile', loginMode: configured?.loginMode ?? 'password' };
    const environment = {
        apiBaseURL: validateBaseURL(flags['api-base-url'] ?? inherited.TEST_API_BASE_URL ?? profile.apiBaseURL),
        webBaseURL: validateBaseURL(flags['web-base-url'] ?? inherited.TEST_WEB_BASE_URL ?? configured?.baseURL ?? profile.webBaseURL),
    };
    requireCondition(Object.keys(overrides).every((name) => flow.params.some((param) => param.name === name)), '存在未声明的流程参数');
    const values = {};
    for (const param of flow.params) {
        const value = overrides[param.name] ?? inherited[`FLOW_${param.name}`] ?? param.default;
        if (param.required) requireCondition(typeof value === 'string' && value.trim().length > 0, `缺少参数：${param.name}`);
        if (value !== undefined) values[param.name] = String(value);
    }
    return { environment, values, portal };
}

export function flowHash(root, flow) {
    const common = flow.runner === 'playwright' ? ['playwright.config.ts'] : brunoConfigFiles(root, flow);
    const dependencies = flow.runner === 'playwright' ? dependencyGraph(root, [flow.entry, ...flow.inputs, ...flow.steps, ...common]) : [];
    const files = [...new Set([...dependencies, flow.manifest, flow.plan, flow.entry, ...flow.steps, ...flow.inputs, ...common,
        '../package.json', '../pnpm-lock.yaml', 'framework/cli.mjs', 'framework/core.mjs', 'framework/inspect.mjs', 'framework/process.mjs', 'framework/bruno.mjs', 'framework/session.mjs', 'framework/scaffold.mjs', 'framework/utils.mjs', 'framework/maintenance.mjs', 'framework/batch.mjs', 'framework/catalog.mjs', 'framework/browser.mjs'])].sort();
    const hash = createHash('sha256');
    for (const relative of files) {
        const file = path.resolve(root, relative);
        hash.update(relative).update('\0').update(fs.readFileSync(file)).update('\0');
    }
    return hash.digest('hex');
}

export function summarizePlaywright(report) {
    requireCondition(report && report.stats && ['expected', 'unexpected', 'skipped', 'flaky'].every(
        (name) => Number.isSafeInteger(report.stats[name]) && report.stats[name] >= 0), 'Playwright 报告缺少有效 stats');
    const cases = [];
    const visit = (suite) => {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                const last = test.results?.at(-1);
                cases.push({ name: spec.title, file: spec.file ?? suite.file, project: test.projectName, passed: test.status === 'expected' && last?.status === 'passed', completed: last?.status === 'passed',
                    skipped: test.status === 'skipped' || last?.status === 'skipped', flaky: test.status === 'flaky',
                    checks: last?.status === 'passed' ? 1 : 0, attachments: last?.attachments ?? [] });
            }
        }
        for (const child of suite.suites ?? []) visit(child);
    };
    for (const suite of report.suites ?? []) visit(suite);
    const reported = ['expected', 'unexpected', 'skipped', 'flaky'].reduce((sum, name) => sum + report.stats[name], 0);
    return { cases, errors: (report.errors ?? []).length + report.stats.unexpected + (reported === cases.length ? 0 : 1) };
}

export function summarizeBruno(report) {
    requireCondition(Array.isArray(report), 'Bruno 报告必须为数组');
    const cases = [];
    for (const iteration of report) {
        for (const result of iteration.results ?? []) {
            const checks = ['assertionResults', 'testResults', 'preRequestTestResults', 'postResponseTestResults']
                .flatMap((key) => result[key] ?? []);
            cases.push({ name: result.path ?? result.name, file: result.test?.filename, passed: result.status === 'pass' && !result.error && !result.skipped
                && checks.length > 0 && checks.every((check) => check.status === 'pass'),
                skipped: Boolean(result.skipped), flaky: false, checks: checks.length, attachments: [] });
        }
    }
    return { cases, errors: report.reduce((sum, iteration) => sum + (iteration.summary?.errorRequests ?? 0), 0) };
}

function attachmentBytes(attachment, artifactDir) {
    let bytes;
    if (attachment.path) {
        const file = path.isAbsolute(attachment.path) ? attachment.path : path.resolve(artifactDir, attachment.path);
        const real = fs.realpathSync(file);
        requireCondition(real.startsWith(`${fs.realpathSync(artifactDir)}${path.sep}`) && fs.statSync(real).isFile(), '附件路径越界');
        bytes = fs.readFileSync(real);
    } else if (typeof attachment.body === 'string') bytes = Buffer.from(attachment.body, 'base64');
    requireCondition(bytes?.length > 0, '附件不存在或为空');
    if (attachment.contentType === 'application/json') JSON.parse(bytes.toString('utf8'));
    return bytes;
}

export function captureEvidence(flow, report, artifactDir) {
    const summary = flow.runner === 'playwright' ? summarizePlaywright(report) : summarizeBruno(report);
    return summary.cases.flatMap((item, caseIndex) => item.attachments.map((attachment, attachmentIndex) => {
        let sha256 = null;
        try { sha256 = digest(attachmentBytes(attachment, artifactDir)); } catch { /* 无效附件留为失败证据。 */ }
        return { caseIndex, attachmentIndex, sha256 };
    }));
}

function sameEntry(item, flow) {
    if (typeof item.file !== 'string') return false;
    const normalized = path.posix.normalize(item.file.replaceAll('\\', '/'));
    return flow.runner === 'playwright'
        ? normalized === flow.entry.replace(/^playwright\//, '') && item.project === flow.project
        : normalized === flow.entry.replace(/^bruno\//, '');
}

export function verifyReport(record, report, artifactDir) {
    const summary = record.flow.runner === 'playwright' ? summarizePlaywright(report) : summarizeBruno(report);
    const issues = [];
    if (record.status !== 'passed' || record.exitCode !== 0) issues.push('进程未正常通过');
    if (record.evidenceVersion !== 2 || !Array.isArray(record.evidenceDigests)) issues.push('运行缺少 v2 证据摘要，需重新执行');
    if (summary.errors) issues.push('报告包含执行错误');
    if (summary.cases.length !== record.flow.expectedCases) issues.push(`用例数量不符：${summary.cases.length}/${record.flow.expectedCases}`);
    if (!summary.cases.length) issues.push('没有执行任何用例');
    if (!summary.cases.some((item) => item.passed || item.completed)) issues.push('没有任何实际通过的用例');
    for (const [caseIndex, item] of summary.cases.entries()) {
        if (!sameEntry(item, record.flow)) issues.push(`报告入口或项目不属于本流程：${item.name}`);
        if (!item.passed || item.skipped || item.flaky || !item.checks) issues.push(`用例失败、跳过、flaky 或没有断言：${item.name}`);
        if (item.attachments.some((attachment) => attachment.name === 'skipped-assertions')) issues.push(`存在断言降级：${item.name}`);
        for (const [attachmentIndex, attachment] of item.attachments.entries()) {
            const snapshot = record.evidenceDigests?.find((entry) => entry.caseIndex === caseIndex && entry.attachmentIndex === attachmentIndex);
            try {
                if (!snapshot?.sha256 || snapshot.sha256 !== digest(attachmentBytes(attachment, artifactDir))) {
                    issues.push(`附件摘要缺失或内容已改变：${item.name}/${attachment.name}`);
                }
            } catch { issues.push(`无效附件：${item.name}/${attachment.name}`); }
        }
        for (const name of record.flow.evidence.requiredAttachments) {
            if (!item.attachments.some((attachment) => attachment.name === name && (() => { try { return Boolean(attachmentBytes(attachment, artifactDir)); } catch { return false; } })())) {
                issues.push(`缺少有效证据：${item.name}/${name}`);
            }
        }
    }
    const kind = { timed_out: 'TIMEOUT', interrupted: 'INTERRUPTED', failed: 'EXECUTION', running: 'EXECUTION' }[record.status] ?? 'VERIFICATION';
    return { ok: issues.length === 0, complete: issues.length === 0,
        failureKind: issues.length ? kind : null, cases: summary.cases.length, issues };
}
