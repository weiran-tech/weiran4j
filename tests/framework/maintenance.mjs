import fs from 'node:fs';
import path from 'node:path';
import { readJson, loadFlows } from "./core.mjs";
import { withFileLock, workflowError } from "./utils.mjs";

const excluded = new Set(['node_modules', '.git', '.local', '.artifacts']);
const ensure = (value, message) => { if (!value) throw workflowError('CONFIG', message); };

function files(directory) {
    const result = [];
    for (const item of fs.readdirSync(directory, { withFileTypes: true })) {
        if (excluded.has(item.name) || item.name.startsWith('.env') || /^(?:package-lock|pnpm-lock)\./.test(item.name)) continue;
        ensure(!item.isSymbolicLink(), '删除目录不允许符号链接');
        const file = path.join(directory, item.name);
        if (item.isDirectory()) result.push(...files(file));
        else if (item.isFile()) result.push(file);
    }
    return result.sort();
}

function safeTarget(root, relative) {
    ensure(typeof relative === 'string' && !path.isAbsolute(relative), '目标路径无效');
    const target = path.resolve(root, relative);
    ensure(target.startsWith(path.resolve(root) + path.sep), '目标路径越界');
    let existing = target;
    while (!fs.existsSync(existing)) existing = path.dirname(existing);
    const real = fs.realpathSync(existing), boundary = fs.realpathSync(root);
    ensure(real === boundary || real.startsWith(boundary + path.sep), '目标链接越界');
    return target;
}
function transaction(root, writes, check) {
    const previous = new Map();
    try {
        for (const [relative, bytes] of writes) {
            const target = safeTarget(root, relative);
            previous.set(relative, fs.existsSync(target) ? fs.readFileSync(target) : null);
            if (bytes === null) { if (fs.existsSync(target)) fs.unlinkSync(target); }
            else { fs.mkdirSync(path.dirname(target), { recursive: true }); fs.writeFileSync(target, bytes); }
        }
        check();
    } catch (error) {
        for (const [relative, bytes] of [...previous].reverse()) {
            const target = safeTarget(root, relative);
            if (bytes === null) { if (fs.existsSync(target)) fs.unlinkSync(target); }
            else fs.writeFileSync(target, bytes);
        }
        throw error;
    } finally {
        // 清除本次操作留下的空目录；不递归删除任何已有内容。
        for (const relative of previous.keys()) {
            let dir = path.dirname(safeTarget(root, relative));
            while (dir !== path.resolve(root)) {
                try { fs.rmdirSync(dir); } catch { break; }
                dir = path.dirname(dir);
            }
        }
    }
}
function indexChanges(root, writes) {
    const name = 'support/steps/INDEX.md';
    let content = fs.readFileSync(path.join(root, name), 'utf8');
    for (const [file, bytes] of writes) {
        if (!file.startsWith('support/steps/') || !file.endsWith('.ts')) continue;
        const step = file.slice('support/steps/'.length);
        if (bytes === null) content = content.split('\n').filter((line) => !line.includes('`' + step + '`')).join('\n');
    }
    writes.set(name, Buffer.from(content));
}
function diff(root, writes) {
    return [...writes].flatMap(([file, bytes]) => {
        const target = safeTarget(root, file), exists = fs.existsSync(target);
        if (bytes === null) return exists ? [{ file, change: 'removed' }] : [];
        return exists && fs.readFileSync(target).equals(bytes) ? [] : [{ file, change: exists ? 'changed' : 'added' }];
    });
}

export function removeFlow(root, id, { dryRun = false, yes = false } = {}) {
    const apply = () => {
        const flows = loadFlows(root), flow = flows.find((item) => item.id === id);
        ensure(flow, '流程不存在');
        const directory = path.dirname(flow.manifest);
        ensure(directory.split('/').length >= 3 && !flows.some((item) => item.id !== id && item.manifest.startsWith(directory + '/')), '仅可删除独立流程目录');
        const writes = new Map(files(path.join(root, directory)).map((file) => [path.relative(root, file), null]));
        const remaining = flows.filter((item) => item.id !== id);
        const used = new Set(remaining.flatMap((item) => item.steps));
        for (const step of flow.steps) if (!used.has(step)) writes.set(step, null);
        const registry = readJson(path.join(root, 'registry.json'));
        registry.flows = registry.flows.filter((name) => name !== flow.manifest);
        ensure(registry.flows.length > 0, '至少保留一个基线流程');
        writes.set('registry.json', Buffer.from(JSON.stringify(registry, null, 2) + '\n'));
        indexChanges(root, writes);
        const changes = diff(root, writes);
        if (!dryRun && yes) transaction(root, writes, () => { loadFlows(root); });
        return { id, dryRun: dryRun || !yes, changes, note: yes ? '运行证据与反馈保留。' : '仅预览；传 --yes 执行删除，保留历史证据。' };
    };
    return dryRun || !yes ? apply() : withFileLock(root, 'scaffold', apply);
}
