import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { inside, digest } from './core.mjs';
import { checkDiscovery } from './inspect.mjs';
import { nativeReportLibrary } from './report-model.mjs';
import { writeNativeReport } from './report.mjs';

const require = createRequire(import.meta.url);

// 仅加载声明：--list 不执行 test、fixture 或 hooks，也不启动浏览器。
export function discoverCases(root, flows) {
    const cli = require.resolve('@playwright/test/cli');
    const discovered = spawnSync(process.execPath, [cli, 'test', '--list', '--reporter=json', '--config', path.join(root, 'playwright.config.ts')],
        { cwd: path.dirname(root), encoding: 'utf8', timeout: 60_000, maxBuffer: 10 * 1024 * 1024 });
    if (discovered.status !== 0) throw new Error(`Playwright 用例发现失败\n${discovered.stderr ?? ''}\n${discovered.stdout ?? ''}`);
    const report = JSON.parse(discovered.stdout);
    const issues = checkDiscovery(flows, report);
    if (issues.length) throw new Error(issues.join('\n'));
    const cases = [];
    const visit = (suite, parents = []) => {
        const titles = suite.file === suite.title ? parents : [...parents, suite.title].filter(Boolean);
        for (const spec of suite.specs ?? []) for (const test of spec.tests ?? []) {
            const flow = flows.find((flow) => flow.project === test.projectName && flow.entry === (spec.file ?? suite.file));
            cases.push({ flow, title: [...titles, spec.title].join(' / '), line: spec.line, column: spec.column, tags: spec.tags ?? [] });
        }
        for (const child of suite.suites ?? []) visit(child, titles);
    };
    for (const suite of report.suites ?? []) visit(suite);
    // 只解析请求声明，禁止调用 Bruno run 或执行请求脚本。
    const cliRequire = createRequire(require.resolve('@usebruno/cli/package.json'));
    const store = cliRequire('@usebruno/filestore');
    for (const flow of flows.filter((flow) => flow.runner === 'bruno')) {
        const request = store.parseRequest(fs.readFileSync(inside(root, flow.entry), 'utf8'), { format: 'yml' });
        cases.push({ flow, title: request.name ?? flow.title, line: 1, column: 1, tags: [] });
    }
    return cases;
}

export async function writeCaseCatalog(root, cases) {
    const { Suite, TestCase } = nativeReportLibrary();
    const suite = new Suite('', 'root'), projects = new Map();
    for (const relative of ['.artifacts', '.artifacts/catalog']) {
        if (!fs.existsSync(path.join(root, relative))) fs.mkdirSync(path.join(root, relative));
        inside(root, relative);
    }
    const directory = path.join(fs.mkdtempSync(path.join(inside(root, '.artifacts/catalog'), 'view-')), 'report');
    for (const [index, entry] of cases.entries()) {
        const { flow } = entry;
        const name = flow.runner === 'bruno' ? 'bruno' : flow.project;
        if (!projects.has(name)) {
            const project = new Suite(name, 'project');
            project._fullProject = { project: { name, testDir: root, outputDir: directory, retries: 0, repeatEach: 1, use: {} } };
            suite._addSuite(project); projects.set(name, project);
        }
        const project = projects.get(name);
        let file = project.suites.find((item) => item.title === flow.id);
        const location = { file: inside(root, flow.entry), line: entry.line ?? 1, column: entry.column ?? 1 };
        if (!file) { file = new Suite(flow.id, 'file'); file.location = location; project._addSuite(file); }
        const test = new TestCase(`未执行 · ${entry.title}`, undefined, undefined, location);
        test.id = digest(`catalog/${flow.id}/${index}/${entry.title}`).slice(0, 32);
        test._tags = [...new Set([...flow.tags, ...entry.tags].map((tag) => tag.startsWith('@') ? tag : `@${tag}`))];
        test.annotations = [{ type: '未执行', description: '只读用例目录：仅发现声明，没有运行测试。原生界面以 Skipped 展示，不是执行结果。' },
            { type: 'flow', description: `${flow.id} · ${flow.title}` },
            { type: '环境', description: flow.envs.join(', ') },
            { type: '前提', description: flow.preconditions.join('；') },
            ...(flow.limitations?.length ? [{ type: '范围限制', description: flow.limitations.join('；') }] : []),
            ...(flow.blockedReason ? [{ type: '阻塞', description: flow.blockedReason }] : [])];
        test.results = []; test.outcome = () => 'skipped';
        file._addTest(test);
    }
    const config = { rootDir: root, configFile: '', projects: [...projects.values()].map((item) => item.project()), tags: [],
        metadata: { mode: '用例目录（未执行）', note: 'API/E2E 来自 Playwright --list；Bruno 来自请求声明。Skipped 仅表示未运行。此目录独立保存，不计入测试批次和历史结果。' } };
    return writeNativeReport(root, directory, { suite, config, result: { status: 'passed', startTime: new Date(), duration: 0 } }, 'weiran4j · 用例目录（未执行）');
}

export async function startCaseCatalogServer(file) {
    const playwright = createRequire(require.resolve('@playwright/test/package.json'));
    const server = playwright('playwright-core/lib/coreBundle').utils.serveFolder(path.dirname(file));
    await server.start({ host: '127.0.0.1', port: 0 });
    // 原生 All 默认隐藏 skipped；直接定位未执行条目，不修改原生 HTML。
    return { server, url: `${server.urlPrefix('precise')}#?q=s:skipped` };
}

export async function showCaseCatalog(file, timeoutMs = 1800000) {
    const { server, url } = await startCaseCatalogServer(file);
    const playwright = createRequire(require.resolve('@playwright/test/package.json'));
    let timer, stop;
    const closed = new Promise((resolve) => { stop = resolve; timer = setTimeout(resolve, timeoutMs); });
    process.once('SIGINT', stop); process.once('SIGTERM', stop);
    try {
        console.log(`用例目录：${url}（Ctrl+C 关闭服务；搜索时保留 s:skipped）`);
        await playwright('playwright-core/lib/utilsBundle').open(url).catch(() => console.log('浏览器未自动打开，请访问上方地址。'));
        await closed;
    } finally {
        clearTimeout(timer); process.off('SIGINT', stop); process.off('SIGTERM', stop);
        await server.stop();
    }
}
