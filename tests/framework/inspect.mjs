import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const slash = (file) => file.split(path.sep).join('/');

// 从 TypeScript 语法树收集依赖，包含重导出、require 和字面量动态 import。
export function dependencyGraph(root, entries) {
    const ts = require('typescript');
    root = fs.realpathSync(root);
    const config = path.join(root, 'tsconfig.json');
    let options = { moduleResolution: ts.ModuleResolutionKind.Bundler, resolveJsonModule: true, allowJs: true };
    const configs = new Set();
    if (fs.existsSync(config)) {
        const parsed = ts.getParsedCommandLineOfConfigFile(config, {}, {
            ...ts.sys,
            readFile(file) { configs.add(fs.realpathSync(file)); return ts.sys.readFile(file); },
            onUnRecoverableConfigFileDiagnostic() { throw new Error('测试 tsconfig 无法解析'); },
        });
        const errors = parsed?.errors.filter((error) => error.code !== 18003) ?? [];
        if (!parsed || errors.length) throw new Error('测试 tsconfig 或继承配置无效');
        options = { ...options, ...parsed.options };
    }
    const repository = fs.realpathSync(path.dirname(root));
    const files = new Map();
    const visit = (file) => {
        file = fs.realpathSync(file);
        if (!file.startsWith(`${repository}${path.sep}`)) throw new Error('本地测试依赖越界');
        if (files.has(file)) return;
        const imports = [];
        files.set(file, imports);
        if (!/\.[cm]?[jt]sx?$/.test(file)) return;
        const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
        const add = (node) => {
            if (!node || !ts.isStringLiteralLike(node)) return;
            const name = node.text;
            const resolved = ts.resolveModuleName(name, file, options, ts.sys).resolvedModule;
            if (!resolved) {
                if (name.startsWith('.')) throw new Error(`依赖无法解析：${slash(path.relative(root, file))} → ${name}`);
                return; // 外部包/Node 内置模块由类型检查与根锁文件约束。
            }
            if (resolved.isExternalLibraryImport) return;
            const dependency = fs.realpathSync(resolved.resolvedFileName);
            imports.push(dependency);
            visit(dependency);
        };
        const walk = (node) => {
            if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) add(node.moduleSpecifier);
            if (ts.isImportEqualsDeclaration(node) && ts.isExternalModuleReference(node.moduleReference)) add(node.moduleReference.expression);
            if (ts.isCallExpression(node) && (node.expression.kind === ts.SyntaxKind.ImportKeyword
                || (ts.isIdentifier(node.expression) && node.expression.text === 'require'))) {
                if (!node.arguments[0] || !ts.isStringLiteralLike(node.arguments[0])) {
                    throw new Error(`不支持无法静态追踪的动态依赖：${slash(path.relative(root, file))}`);
                }
                add(node.arguments[0]);
            }
            ts.forEachChild(node, walk);
        };
        walk(source);
    };
    configs.forEach(visit);
    entries.forEach((file) => visit(path.resolve(root, file)));
    return [...files.keys()].map((file) => slash(path.relative(root, file))).sort();
}

export function inspectSteps(root, flows) {
    const directory = path.join(root, 'support/steps');
    const steps = [];
    const scan = (dir) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, item.name);
            if (item.isDirectory()) scan(file);
            else if (item.name.endsWith('.ts')) steps.push(slash(path.relative(root, file)));
        }
    };
    scan(directory);
    const issues = [];
    const referenced = new Set();
    for (const flow of flows.filter((flow) => flow.runner === 'playwright')) {
        const actual = dependencyGraph(root, [flow.entry]).filter((file) => file.startsWith('support/steps/'));
        actual.forEach((file) => referenced.add(file));
        for (const file of actual) if (!flow.steps.includes(file)) issues.push(`${flow.id}: 实际引用步骤未声明：${file}`);
        for (const file of flow.steps) if (!actual.includes(file)) issues.push(`${flow.id}: 声明步骤未被引用：${file}`);
    }
    const index = fs.readFileSync(path.join(directory, 'INDEX.md'), 'utf8');
    const indexed = [...index.matchAll(/`([^`]+\.ts)`/g)].map((match) => `support/steps/${match[1]}`);
    for (const file of steps) {
        if (!referenced.has(file)) issues.push(`无流程引用的步骤：${file}`);
        if (!indexed.includes(file)) issues.push(`步骤未登记 INDEX：${file}`);
    }
    for (const file of indexed) {
        if (!steps.includes(file)) issues.push(`INDEX 步骤不存在：${file}`);
        if (indexed.filter((item) => item === file).length > 1) issues.push(`INDEX 步骤重复：${file}`);
    }
    return [...new Set(issues)];
}

export function checkDiscovery(flows, report) {
    const counts = new Map();
    const walk = (suite) => {
        for (const spec of suite.specs ?? []) {
            for (const test of spec.tests ?? []) {
                const key = `${test.projectName}:${slash(spec.file ?? suite.file ?? '')}`;
                counts.set(key, (counts.get(key) ?? 0) + 1);
            }
        }
        for (const child of suite.suites ?? []) walk(child);
    };
    (report.suites ?? []).forEach(walk);
    const issues = (report.errors ?? []).map(() => 'Playwright 用例发现包含加载错误');
    for (const flow of flows.filter((flow) => flow.runner === 'playwright')) {
        // Playwright JSON file 相对 tests 根目录，与 entry 一致。
        const key = `${flow.project}:${flow.entry}`;
        const count = counts.get(key) ?? 0;
        if (count !== flow.expectedCases) issues.push(`${flow.id}: 发现用例数量不符：${count}/${flow.expectedCases}`);
        counts.delete(key);
    }
    for (const [key, count] of counts) issues.push(`存在未登记用例：${key} (${count})`);
    return issues;
}

export async function probeService(name, address, endpoint, expected, fetcher = fetch) {
    let response;
    try {
        response = await fetcher(`${address}${endpoint}`, { signal: AbortSignal.timeout(10000), redirect: 'manual' });
    } catch (error) {
        return { name, ok: false, detail: error.name === 'TimeoutError' ? '连接超时' : '无法连接' };
    }
    let body = null;
    if (name !== 'manage') {
        try { body = await response.json(); }
        catch { return { name, ok: false, status: response.status, detail: '响应无法解析为 JSON' }; }
    }
    const ok = expected(response.status, body);
    const detail = ok ? '可用' : name === 'health' && body?.data?.status === 'DOWN'
        ? '存活状态 DOWN' : '服务已响应，但健康或响应契约异常';
    return { name, ok, status: response.status, detail };
}
