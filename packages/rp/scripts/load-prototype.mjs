import { readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { assembleManifest } from '../prototype/manifest.mjs';
const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
export function readManifest(root = defaultRoot, { allowLegacy = false } = {}) {
    const read = path => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
    const index = read('prototype/releases.json');
    // 旧 CLI 夹具与迁移前副本仍可读取，当前源码始终使用拆分结构。
    if (allowLegacy && Array.isArray(index.releases)) return index;
    const files = {};
    const walk = relative => {
        for (const entry of readdirSync(resolve(root, relative), { withFileTypes: true })) {
            const path = `${relative}/${entry.name}`;
            if (entry.isDirectory()) walk(path);
            else if (entry.name.endsWith('.json')) files[path] = read(path);
        }
    };
    walk('prototype/versions');
    return assembleManifest(index, files);
}
export function readGitManifest(git, reference, prefix = '') {
    const index = JSON.parse(git('show', `${reference}:${prefix}prototype/releases.json`));
    if (Array.isArray(index.releases)) return index;
    const paths = git('ls-tree', '--full-tree', '-r', '--name-only', `${reference}:${prefix}prototype/versions`).split('\n').filter(path => path.endsWith('.json'));
    return assembleManifest(index, Object.fromEntries(paths.map(path => [`prototype/versions/${path}`, JSON.parse(git('show', `${reference}:${prefix}prototype/versions/${path}`))])));
}
/** 只写实际变化的文件，已完结版本不会因整份写回而被格式化。 */
export function writeManifest(manifest, root = defaultRoot) {
    const entries = {};
    for (const release of manifest.releases) {
        const { changes, ...version } = release;
        const base = `prototype/versions/${release.id}`;
        entries[`${base}/version.json`] = version;
        const groups = new Map();
        for (const { pageId, ...change } of changes) groups.set(pageId, [...(groups.get(pageId) ?? []), change]);
        for (const [pageId, changes] of groups) entries[`${base}/changes/${pageId}.json`] = { pageId, changes };
    }
    const index = { current: manifest.current, activeVersion: manifest.activeVersion ?? null };
    assembleManifest(index, entries);
    const checkExisting = relative => {
        let children; try { children = readdirSync(resolve(root, relative), { withFileTypes: true }); } catch (error) { if (error.code === 'ENOENT') return; throw error; }
        for (const child of children) {
            const path = `${relative}/${child.name}`;
            if (child.isDirectory()) checkExisting(path);
            else if (child.name.endsWith('.json') && !Object.hasOwn(entries, path)) throw new Error(`写回将遗留已删除分组，请先显式处理：${path}`);
        }
    };
    checkExisting('prototype/versions');
    for (const [path, data] of [...Object.entries(entries), ['prototype/releases.json', index]]) {
        const target = resolve(root, path); const content = JSON.stringify(data, null, 2) + '\n';
        let old; try { old = readFileSync(target, 'utf8'); } catch (error) { if (error.code !== 'ENOENT') throw error; }
        if (old === content) continue;
        mkdirSync(dirname(target), { recursive: true }); writeFileSync(target, content);
    }
}
