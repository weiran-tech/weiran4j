import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { withFileLock, workflowError } from "./utils.mjs";
const require = createRequire(import.meta.url);

function idParts(id) {
    if (!/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(id ?? '')) throw new Error('id 必须为 domain/name 小写 kebab-case');
    return id.split('/');
}
function withinRoot(root, target) {
    let existing = target;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    const real = fs.realpathSync(existing);
    const boundary = fs.realpathSync(root);
    if (real !== boundary && !real.startsWith(`${boundary}${path.sep}`)) throw new Error('脚手架目标链接越界');
}

// 前缀令 default/delete/await 等合法业务名也能生成合法函数。
const camel = (name) => 'step' + name.split('-').map((part) => part[0].toUpperCase() + part.slice(1)).join('');
function validateSource(source) {
    const ts = require('typescript');
    if (ts.createSourceFile('generated.ts', source, ts.ScriptTarget.Latest, true).parseDiagnostics.length) {
        throw workflowError('CONFIG', '生成代码语法检查失败，未写入文件');
    }
}
function atomic(file, content) {
    const temporary = `${file}.tmp-${process.pid}`;
    let descriptor;
    try {
        descriptor = fs.openSync(temporary, 'wx');
        try { fs.writeFileSync(descriptor, content); }
        finally { fs.closeSync(descriptor); }
        fs.renameSync(temporary, file);
    } finally { if (descriptor !== undefined && fs.existsSync(temporary)) fs.unlinkSync(temporary); }
}

function stepContent(name, type = 'Page') {
    return `import type { ${type} } from '@playwright/test';\n\n/** TODO: 填写业务动作与可观察通过标准。 */\nexport async function ${camel(name)}(_context: ${type}) {\n    throw new Error('TODO: 请实现真实步骤，模板不能直接算通过');\n}\n`;
}
function indexContent(root, relative) {
    const file = path.join(root, 'support/steps/INDEX.md');
    const content = fs.readFileSync(file, 'utf8');
    if (content.includes('`' + relative + '`')) throw new Error('步骤索引已存在');
    return { file, previous: content, content: `${content.trimEnd()}\n| \`${relative}\` | TODO: 填写职责 | TODO: 声明副作用 |\n` };
}

function newStepUnlocked(root, id, dryRun = false) {
    const [domain, name] = idParts(id);
    const relative = `${domain}/${name}.ts`;
    const file = path.join(root, 'support/steps', relative);
    withinRoot(root, file);
    if (fs.existsSync(file)) throw new Error('步骤文件已存在，拒绝覆盖');
    const index = indexContent(root, relative);
    validateSource(stepContent(name));
    if (!dryRun) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, stepContent(name), { flag: 'wx' });
        try { atomic(index.file, index.content); }
        catch (error) { fs.unlinkSync(file); throw error; }
    }
    return { dryRun, files: [path.relative(root, file), 'support/steps/INDEX.md'], note: '填写步骤并在流程中实际引用；未引用步骤会被校验拒绝。' };
}

function initFlowUnlocked(root, id, { runner = 'playwright', project = 'e2e', title = id, dryRun = false } = {}) {
    const [domain, name] = idParts(id);
    if (!['playwright', 'bruno'].includes(runner) || !['api', 'e2e'].includes(project)) throw new Error('runner 或 project 无效');
    const registryFile = path.join(root, 'registry.json');
    const registry = JSON.parse(fs.readFileSync(registryFile, 'utf8'));
    for (const relative of registry.flows) if (JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8')).id === id) throw new Error('流程 id 已存在');
    const directory = runner === 'playwright' ? `${project}/${domain}/${name}` : `bruno/${domain}/${name}`;
    withinRoot(root, path.join(root, directory));
    withinRoot(root, path.join(root, 'support/steps', domain));
    if (fs.existsSync(path.join(root, directory))) throw new Error('流程目录已存在，拒绝覆盖');
    const template = path.join(root, 'framework/templates', runner);
    const flow = JSON.parse(fs.readFileSync(path.join(template, 'flow.json'), 'utf8'));
    flow.id = id; flow.businessProject = 'weiran4j'; flow.title = title; flow.tags = ['draft'];
    flow.entry = `${directory}/${runner === 'playwright' ? `${name}.spec.ts` : 'request.yml'}`;
    const files = new Map();
    let index;
    if (runner === 'playwright') {
        flow.project = project;
        flow.inputs = ['support/fixtures/test.ts'];
        flow.steps = [`support/steps/${domain}/${name}.ts`];
        if (fs.existsSync(path.join(root, flow.steps[0]))) throw new Error('对应步骤已存在，请手动复用，拒绝覆盖');
        index = indexContent(root, `${domain}/${name}.ts`);
        files.set(flow.steps[0], stepContent(name, project === 'api' ? 'APIRequestContext' : 'Page'));
        const relativeImport = (target) => path.posix.relative(directory, target).replace(/\.ts$/, '');
        files.set(flow.entry, `import { test } from '${relativeImport('support/fixtures/test.ts')}';\nimport { ${camel(name)} } from '${relativeImport(flow.steps[0])}';\n\ntest(${JSON.stringify(title)}, async ({ ${project === 'api' ? 'backend' : 'page'} }) => {\n    await test.step('TODO: 真实业务步骤', () => ${camel(name)}(${project === 'api' ? 'backend' : 'page'}));\n});\n`);
    } else {
        delete flow.project;
        flow.steps = [];
        files.set(flow.entry, fs.readFileSync(path.join(template, 'request.yml'), 'utf8'));
    }
    for (const [file, content] of files) if (file.endsWith('.ts')) validateSource(content);
    const manifest = `${directory}/flow.json`;
    files.set(manifest, JSON.stringify(flow, null, 2) + '\n');
    files.set(`${directory}/plan.md`, fs.readFileSync(path.join(template, 'plan.md'), 'utf8'));
    if (!dryRun) {
        const created = [];
        let indexUpdated = false;
        try {
            for (const [relative, content] of files) {
                const file = path.join(root, relative);
                fs.mkdirSync(path.dirname(file), { recursive: true });
                fs.writeFileSync(file, content, { flag: 'wx' }); created.push(file);
            }
            if (index) { atomic(index.file, index.content); indexUpdated = true; }
            registry.flows.push(manifest);
            atomic(registryFile, JSON.stringify(registry, null, 2) + '\n');
        } catch (error) {
            for (const file of created) fs.unlinkSync(file);
            if (indexUpdated) atomic(index.file, index.previous);
            // 只移除本次创建的流程目录；已存在目录在前置阶段即被拒绝。
            fs.rmSync(path.join(root, directory), { recursive: true, force: true });
            throw error;
        }
    }
    return { dryRun, files: [...files.keys(), 'registry.json', ...(index ? ['support/steps/INDEX.md'] : [])], note: '已登记 draft；模板运行必失败，填写计划、步骤、证据后再运行。' };
}

export function newStep(root, id, dryRun = false) {
    return dryRun ? newStepUnlocked(root, id, true) : withFileLock(root, 'scaffold', () => newStepUnlocked(root, id, false));
}
export function initFlow(root, id, options = {}) {
    return options.dryRun ? initFlowUnlocked(root, id, options) : withFileLock(root, 'scaffold', () => initFlowUnlocked(root, id, options));
}
