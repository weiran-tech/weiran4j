import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { inside, readJson, digest } from './core.mjs';

// Playwright 导出的报告模型/HTML reporter 适配集中于此；升级固定版本时由原生报告回归验收。
export function nativeReportLibrary() {
    const require = createRequire(import.meta.url);
    const playwright = createRequire(require.resolve('@playwright/test/package.json'));
    const version = playwright('playwright/package.json').version;
    if (version !== '1.65.0') throw new Error(`Playwright 报告适配需验证版本 ${version}（当前支持 1.65.0）`);
    return { ...playwright('playwright/lib/common').test, HtmlReporter: playwright('playwright/lib/runner').html.default };
}
const validId = (id) => /^\d{17}-[a-f0-9]{8}$/.test(id ?? '');
const error = (value) => typeof value === 'string' ? { message: value } : { message: value?.message ?? String(value?.value ?? '执行失败'), ...(value?.stack ? { stack: value.stack } : {}) };
const date = (value, fallback) => Number.isFinite(Date.parse(value)) ? new Date(value) : fallback;
const location = (root, file, line = 1, column = 1) => ({ file: path.resolve(root, file || 'registry.json'), line, column });

function attachment(root, runId, value) {
    const result = { name: String(value.name ?? '附件'), contentType: typeof value.contentType === 'string' ? value.contentType : 'application/octet-stream' };
    if (value.path) {
        const directory = inside(root, `.artifacts/runs/${runId}`);
        const relative = path.relative(directory, path.resolve(directory, value.path));
        const file = inside(directory, relative);
        if (!fs.statSync(file).isFile()) throw new Error('附件不是文件');
        result.path = file;
    } else if (typeof value.body === 'string') result.body = Buffer.from(value.body, 'base64');
    else throw new Error('附件缺失');
    return result;
}

function steps(root, source, startTime, parent) {
    return (Array.isArray(source) ? source : []).filter((value) => value && typeof value === 'object').map((value) => {
        const step = { title: value.title ?? '步骤', category: value.category ?? 'test.step', duration: value.duration ?? 0,
            startTime: date(value.startTime, startTime), annotations: value.annotations ?? [], attachments: [],
            location: value.location ? location(root, value.location.file, value.location.line, value.location.column) : undefined,
            error: value.error ? error(value.error) : undefined, parent };
        step.steps = steps(root, value.steps, step.startTime, step);
        return step;
    });
}

export function buildReportModel(root, batch) {
    const { Suite, TestCase } = nativeReportLibrary();
    const suite = new Suite('', 'root'), projects = new Map(), issues = [];
    const startTime = date(batch.startedAt, new Date(0));
    const add = (item, title, results, options = {}) => {
        const projectName = options.project ?? (item.runner === 'bruno' ? 'bruno' : item.project ?? 'execution');
        if (!projects.has(projectName)) {
            const project = { name: projectName, outputDir: path.join(root, '.artifacts/runs'), testDir: root, retries: 0, repeatEach: 1, use: {} };
            const projectSuite = new Suite(projectName, 'project'); projectSuite._fullProject = { project };
            suite._addSuite(projectSuite); projects.set(projectName, projectSuite);
        }
        const projectSuite = projects.get(projectName);
        let fileSuite = projectSuite.suites.find((value) => value.title === item.flowId);
        if (!fileSuite) {
            fileSuite = new Suite(item.flowId, 'file');
            fileSuite.location = location(root, options.file ?? item.entry ?? 'registry.json');
            projectSuite._addSuite(fileSuite);
        }
        const test = new TestCase(title, undefined, undefined, location(root, options.file ?? item.entry ?? 'registry.json', options.line, options.column));
        test.id = digest(`${batch.batchId}/${item.flowId}/${projectName}/${fileSuite.tests.length}/${title}`).slice(0, 32);
        test.annotations = [{ type: 'flow', description: item.flowId }, ...(options.annotations ?? [])];
        test._tags = (item.tags ?? []).map((tag) => tag.startsWith('@') ? tag : `@${tag}`);
        test.expectedStatus = options.expectedStatus ?? 'passed';
        test.results = results.map((value, index) => {
            const result = { retry: value.retry ?? index, workerIndex: value.workerIndex ?? -1, parallelIndex: value.parallelIndex ?? 0,
                duration: value.duration ?? 0, startTime: date(value.startTime, startTime), status: value.status ?? 'failed',
                errors: (value.errors ?? (value.error ? [value.error] : [])).map(error), annotations: value.annotations ?? [],
                stdout: [], stderr: [], attachments: [] };
            for (const valueAttachment of value.attachments ?? []) {
                try { result.attachments.push(attachment(root, item.runId, valueAttachment)); }
                catch { issues.push(`${item.flowId} / ${title}：附件缺失或路径越界：${valueAttachment.name ?? '附件'}`); }
            }
            result.steps = steps(root, value.steps, result.startTime);
            return result;
        });
        if (options.outcome) test.outcome = () => options.outcome;
        fileSuite._addTest(test); return test;
    };
    for (const item of batch.items) {
        const issueStart = issues.length;
        const started = validId(item.runId) && item.executed;
        let record, report, nativeCount = 0, verification;
        if (started) {
            try {
                const file = inside(root, `.artifacts/runs/${item.runId}/results.json`);
                record = readJson(inside(root, `.artifacts/runs/${item.runId}/run.json`));
                report = readJson(file);
                if (!Array.isArray(report) && (!report || !Array.isArray(report.suites))) {
                    report = undefined; throw new Error('原生结果结构损坏');
                }
                if (!record.resultsHash || record.resultsHash !== digest(fs.readFileSync(file))) issues.push(`${item.flowId}：原生结果缺少校验值或内容已变化`);
            } catch { issues.push(`${item.flowId}：原生结果或运行记录缺失、损坏`); }
            for (const name of ['verification.json', 'reverification.json']) {
                const file = `.artifacts/runs/${item.runId}/${name}`;
                if (name === 'reverification.json' && !fs.existsSync(path.join(root, file))) continue;
                try {
                    const value = readJson(inside(root, file));
                    if (name === 'verification.json') verification = value;
                    if (value.ok !== true || value.complete !== true) issues.push(`${item.flowId} / ${name}：${(value.issues ?? ['未完整通过']).join('；')}`);
                } catch { issues.push(`${item.flowId} / ${name}：复核记录缺失或损坏`); }
            }
        }
        const origin = { ...item, entry: item.entry ?? record?.flow?.entry, project: item.project ?? record?.flow?.project,
            runner: item.runner ?? record?.flow?.runner, tags: item.tags ?? record?.flow?.tags };
        if (report && !Array.isArray(report)) {
            const visit = (source, parents = []) => {
                if (!source || typeof source !== 'object') { issues.push(`${item.flowId}：原生 suite 损坏`); return; }
                const titles = [...parents, /\.spec\.[cm]?[jt]s$/.test(source.title ?? '') ? undefined : source.title].filter(Boolean);
                for (const spec of Array.isArray(source.specs) ? source.specs : []) for (const sourceTest of Array.isArray(spec.tests) ? spec.tests : []) {
                    nativeCount++;
                    if (!Array.isArray(sourceTest.results) || !sourceTest.results.length) issues.push(`${item.flowId} / ${spec.title}：缺少执行结果`);
                    add(origin, [...titles, spec.title].join(' / '), Array.isArray(sourceTest.results) && sourceTest.results.length ? sourceTest.results : [{ status: 'failed', errors: [{ message: '缺少执行结果' }] }], { file: spec.file ?? source.file ?? origin.entry,
                        line: spec.line, column: spec.column, project: sourceTest.projectName ?? origin.project,
                        expectedStatus: sourceTest.expectedStatus ?? 'passed', outcome: Array.isArray(sourceTest.results) && sourceTest.results.length ? sourceTest.status : 'unexpected',
                        annotations: sourceTest.annotations ?? [] });
                }
                for (const child of Array.isArray(source.suites) ? source.suites : []) visit(child, titles);
            };
            for (const source of report.suites ?? []) visit(source);
            for (const value of Array.isArray(report.errors) ? report.errors : []) issues.push(`${item.flowId}：${error(value).message}`);
        } else if (report) {
            for (const iteration of report) for (const request of iteration.results ?? []) {
                nativeCount++;
                const checks = ['assertionResults', 'testResults', 'preRequestTestResults', 'postResponseTestResults'].flatMap((key) => request[key] ?? []);
                const passed = request.status === 'pass' && !request.error && !request.skipped && checks.length > 0 && checks.every((check) => check.status === 'pass');
                add(origin, request.path ?? request.name ?? 'Bruno 请求', [{ status: request.skipped ? 'skipped' : passed ? 'passed' : 'failed',
                    duration: request.responseTime ?? request.response?.responseTime ?? 0, startTime: record?.startedAt, errors: request.error ? [error(request.error)] : passed ? [] : [{ message: 'Bruno 请求或断言未通过' }],
                    steps: checks.map((check) => ({ title: check.name ?? check.title ?? '断言', error: check.status === 'pass' ? undefined : error(check.error ?? '断言失败') })) }]);
            }
        }
        // 这是执行器已完成的检查结果，不是额外业务用例或重新执行。
        const skipped = ['blocked', 'skipped', 'pending', 'running'].includes(item.status);
        const flowIssues = issues.slice(issueStart);
        if (!nativeCount || item.status !== 'passed' || !verification?.complete || flowIssues.length) {
            const message = item.reason ?? (flowIssues.length ? flowIssues.join('；') : nativeCount ? '执行器或严格证据复核未完整通过' : '未产出可用原生用例结果');
            add(origin, `[执行检查] ${item.status} · ${message}`, [{ status: skipped ? 'skipped' : 'failed', errors: skipped ? [] : [{ message }],
                attachments: [{ name: '执行与复核记录', contentType: 'application/json', body: Buffer.from(JSON.stringify({ flowId: item.flowId, status: item.status,
                    failureKind: item.failureKind, reason: message, verification, issues: flowIssues }, null, 2)).toString('base64') }] }],
            { project: 'execution', annotations: [{ type: item.status, description: message }] });
        }
    }
    return { suite, issues, config: { rootDir: root, configFile: '', projects: [...projects.values()].map((value) => value.project()), tags: [],
        metadata: { batchId: batch.batchId, environment: batch.environment ?? 'local', status: batch.status,
            selection: JSON.stringify(batch.selection ?? {}), counts: JSON.stringify(batch.counts ?? {}), note: '原生业务用例来自已有执行结果；execution 项目展示执行器检查。阻塞映射为 skipped 展示，批次仍不算通过。' } },
        result: { status: batch.ok === true && !issues.length ? 'passed' : 'failed', startTime,
            duration: Math.max(0, date(batch.finishedAt, startTime).getTime() - startTime.getTime()) } };
}
