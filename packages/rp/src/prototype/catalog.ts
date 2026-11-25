import { contextPath } from '../../prototype/model.mjs';
import { globalPath, versionPath } from '../../prototype/routes.mjs';
import { routeVersion, runtimeBase } from './runtime';
import data from '../../prototype/releases.json';
import baselines from '../../prototype/page-baselines.json';
import { completeProduct } from '../../prototype/model.mjs';

import type { Release, Change, Snapshot } from '../../prototype/model.mjs';
export type { Release, Change, Snapshot } from '../../prototype/model.mjs';
export { pageDiffs, pagePaths, previewTarget } from '../../prototype/model.mjs';
export const releases: Release[] = data.releases;
export const currentVersion: string = import.meta.env.VITE_PROTOTYPE_VERSION || data.current;
export const currentRelease = releases.find((release) => release.id === currentVersion) ?? releases[0]!;
export const statusLabels: Record<string, string> = { draft: '草稿', review: '待评审', finalized: '已定稿', baseline: '源码基线' };
export const typeLabels: Record<string, string> = { add: '新增', modify: '修改', remove: '删除' };
export const siteBase = runtimeBase;
export const readingVersion = () => routeVersion || currentVersion;
export const readingRelease = () => releases.find((release) => release.id === readingVersion());
export const productFor = (version: string | Release) => typeof version === 'string' ? completeProduct(releases, version, baselines) : completeProduct([...releases.filter((item) => item.id !== version.id), version], version.id, baselines);
export function sitePath(path: string, version = new URL(path, 'https://prototype.invalid').searchParams.get('version') || readingVersion()) {
    if (siteBase.startsWith('/releases/')) return siteBase + path.replace(/^\//, '');
    const global = globalPath(path);
    if (global !== null) return global;
    const url = new URL(path, 'https://prototype.invalid');
    if (version !== currentVersion && url.pathname === '/manage') url.pathname = '/rp/manage';
    return versionPath(url.pathname + url.search + url.hash, version);
}
export function reviewLink(change: Change, version = currentVersion, scenario = 'normal') {
    return new URL(contextPath(siteBase, change.page, version, change.id, scenario), window.location.origin).href;
}
export function isSnapshot(value: unknown): value is Snapshot {
    if (!value || typeof value !== 'object') return false;
    const record = value as Record<string, unknown>;
    return typeof record.version === 'string' && /^v[\w.-]+$/.test(record.version)
        && (record.base === `/releases/${record.version}/` || record.kind === 'working' && record.base === `/versions/${record.version}/`) && typeof record.commit === 'string' && typeof record.builtAt === 'string';
}
