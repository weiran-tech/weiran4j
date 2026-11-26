import type { Change, Release } from './model';

export interface ReleaseIndex { current: string; activeVersion: string | null }
export interface ReleaseManifest extends ReleaseIndex { releases: Release[] }

/** 文件结构只在入口处理，页面和评审继续使用合并后的 Release。 */
export function assembleManifest(index: ReleaseIndex, files: Record<string, unknown>): ReleaseManifest {
    const versions = new Map<string, Omit<Release, 'changes'>>();
    const groups = new Map<string, Change[]>();
    for (const [path, value] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) {
        const match = /(?:^|\/)versions\/(v\d+\.\d+(?:\.\d+)?)\/(version\.json|changes\/([^/]+)\.json)$/.exec(path);
        if (!match || !value || typeof value !== 'object' || Array.isArray(value)) throw new Error(`版本文件格式或路径非法：${path}`);
        const versionId = match[1]!;
        const data = value as Record<string, unknown>;
        if (match[2] === 'version.json') {
            if (data.id !== versionId || 'changes' in data || versions.has(versionId)) throw new Error(`版本元信息与目录不一致：${path}`);
            versions.set(versionId, data as unknown as Omit<Release, 'changes'>);
        } else {
            if (data.pageId !== match[3] || !Array.isArray(data.changes) || !data.changes.length) throw new Error(`页面改动分组与文件名不一致或为空：${path}`);
            const changes = data.changes.map(item => {
                if (!item || typeof item !== 'object' || Array.isArray(item) || 'pageId' in item) throw new Error(`页面改动应从分组继承 pageId：${path}`);
                return { ...item, pageId: data.pageId } as Change;
            });
            groups.set(versionId, [...(groups.get(versionId) ?? []), ...changes]);
        }
    }
    for (const id of groups.keys()) if (!versions.has(id)) throw new Error(`页面改动缺少版本元信息：${id}`);
    return { ...index, releases: [...versions.values()].sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true })).map(version => ({ ...version, changes: (groups.get(version.id) ?? []).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })) })) };
}

/** 对象键顺序和文件排版不算版本语义变化；数组顺序仍保留。 */
export function canonicalJson(value: unknown): string {
    return JSON.stringify(value, (_key, item: unknown) => item && typeof item === 'object' && !Array.isArray(item) ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
}
