import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

export function brunoConfigFiles(root, flow) {
    const files = ['bruno/opencollection.yml'];
    let directory = path.dirname(path.resolve(root, flow.entry));
    const boundary = path.resolve(root, 'bruno');
    while (directory.startsWith(`${boundary}${path.sep}`)) {
        const folder = path.join(directory, 'folder.yml');
        if (fs.existsSync(folder)) files.push(path.relative(root, folder).split(path.sep).join('/'));
        directory = path.dirname(directory);
    }
    return files;
}

export function validateBruno(root, flows) {
    // 使用 CLI 锁定版本自己的文件解析器及其 YAML 依赖，不执行请求或脚本。
    const cliRequire = createRequire(require.resolve('@usebruno/cli/package.json'));
    const store = cliRequire('@usebruno/filestore');
    const storeRequire = createRequire(cliRequire.resolve('@usebruno/filestore'));
    const yaml = storeRequire('yaml');
    const directory = path.join(root, 'bruno');
    const entries = new Set(flows.filter((flow) => flow.runner === 'bruno').map((flow) => flow.entry));
    const found = new Set();
    const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
    const compile = (scripts) => {
        if (scripts === undefined) return;
        if (!Array.isArray(scripts)) throw new Error('scripts 必须为数组');
        const types = new Set();
        for (const script of scripts) {
            if (!['before-request', 'after-response', 'tests'].includes(script?.type)
                || typeof script.code !== 'string' || types.has(script.type)) throw new Error('脚本类型、内容或重复定义无效');
            types.add(script.type);
            new AsyncFunction(script.code);
        }
    };
    const check = (file, kind) => {
        const relative = path.relative(root, file).split(path.sep).join('/');
        try {
            const source = fs.readFileSync(file, 'utf8');
            const data = yaml.parse(source);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('需要 YAML 对象');
            if (kind === 'collection') {
                if (data.opencollection !== '1.0.0' || !nonempty(data.info?.name) || data.bundled === true) throw new Error('需要有效的目录集合配置');
                store.parseCollection(source, { format: 'yml' });
                compile(data.request?.scripts);
            } else if (kind === 'environment') {
                if (!nonempty(data.name) || !Array.isArray(data.variables)
                    || data.variables.some((variable) => !nonempty(variable?.name))) throw new Error('环境配置无效');
                store.parseEnvironment(source, { format: 'yml' });
            } else if (kind === 'folder') {
                if (data.info?.type !== 'folder' || !nonempty(data.info?.name)) throw new Error('目录配置无效');
                store.parseFolder(source, { format: 'yml' });
                compile(data.request?.scripts);
            } else {
                if (data.info?.type !== 'http' || !nonempty(data.info?.name) || !nonempty(data.http?.url)
                    || !['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD', 'TRACE', 'CONNECT'].includes(data.http?.method)) throw new Error('需要有效的 HTTP 请求定义');
                const meta = store.parseRequest(source, { format: 'yml' });
                if (meta.type !== 'http-request') throw new Error('只支持 HTTP 请求');
                compile(data.runtime?.scripts);
                if (!entries.has(relative)) throw new Error('请求未登记流程');
                const flow = flows.find((flow) => flow.entry === relative);
                if (flow.expectedCases !== 1) throw new Error('单个 .yml 入口 expectedCases 必须为 1');
                found.add(relative);
            }
        } catch { throw new Error(`Bruno 深度校验失败：${relative}（配置、语法、脚本或登记不一致）`); }
    };
    check(path.join(directory, 'opencollection.yml'), 'collection');
    const walk = (dir) => {
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, item.name);
            if (item.name.startsWith('.') || item.name === 'node_modules') continue;
            if (item.isDirectory()) { walk(file); continue; }
            if (item.name === 'bruno.json' || item.name.endsWith('.bru') || item.name.endsWith('.yaml')) {
                throw new Error(`Bruno 仅维护 OpenCollection .yml，请迁移：${path.relative(root, file)}`);
            }
            if (!item.name.endsWith('.yml') || file === path.join(directory, 'opencollection.yml')) continue;
            const kind = file.startsWith(`${path.join(directory, 'environments')}${path.sep}`) ? 'environment'
                : item.name === 'folder.yml' ? 'folder' : 'request';
            check(file, kind);
        }
    };
    walk(directory);
    for (const entry of entries) if (!found.has(entry)) throw new Error(`Bruno 请求缺失：${entry}`);
}
