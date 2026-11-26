export type Platform = 'manage' | 'mobile';
export const platformLabels = { manage: '管理端', mobile: '手机端' };
export interface ProductPage { id: string; title: string; path: string; module: string; platform: 'manage' | 'mobile'; inherited?: boolean }
export interface Change {
    id: string; type: 'add' | 'modify' | 'delete'; title: string; pageId: string; platform?: 'manage' | 'mobile';
    pageTitle: string; page: string; module: string; before: string; after: string;
    rules: string[]; acceptance: string[]; files?: string[];
}
export interface Release {
    id: string; title: string; status: 'in_progress' | 'completed'; baseline: string | null;
    date: string; version?: string; goal: string; changes: Change[];
    platformNotes?: Partial<Record<Platform, { introduction: string; remark: string }>>;
    snapshot?: string; pageSnapshots?: Record<string, string>; editBase?: string; implementationRef?: string;
}
export const statusLabels = { in_progress: '进行中', completed: '已完结' };
export const canReview = (release?: Release) => release?.status === 'in_progress';
export interface CatalogPage extends ProductPage { files: string[]; retired?: boolean }
export function changedPages(release: Release) {
    const pages = new Map<string, ProductPage & { changes: Change[]; deleted: boolean }>();
    for (const change of release.changes) {
        const platform = change.platform ?? 'manage';
        const key = `${platform}:${change.pageId}`;
        const previous = pages.get(key);
        pages.set(key, { id: change.pageId, title: change.pageTitle, path: change.page, module: change.module, platform, inherited: false, deleted: change.type === 'delete', changes: [...(previous?.changes ?? []), change] });
    }
    return [...pages.values()];
}
export function reviewPages(release: Release, releases: Release[], baselines: Record<string, ProductPage[]>) {
    const pages = productPages(release, releases, baselines);
    const keys = new Set(pages.map(p => `${p.platform}:${p.id}`));
    return [...pages, ...changedPages(release).filter(p => !keys.has(`${p.platform}:${p.id}`))];
}
export const changeLabels = { add: '新增', modify: '修改', delete: '删除' };
export const detailPath = (id: string) => `/versions/${encodeURIComponent(id)}/rp/versions`;
/** 仅沿选中基线链合并；同基线的其他版本不会混入。 */
export function productPages(release: Release, releases: Release[], baselines: Record<string, ProductPage[]>, seen = new Set<string>()): ProductPage[] {
    if (seen.has(release.id)) throw new Error('版本基线存在循环');
    const visited = new Set(seen).add(release.id);
    const parent = releases.find((item) => item.id === release.baseline);
    if (release.baseline && !parent) throw new Error(`基线 ${release.baseline} 不存在`);
    if (!parent && !baselines[release.id]) throw new Error('该版本缺少固定页面清单');
    const pages = new Map((parent ? productPages(parent, releases, baselines, visited) : baselines[release.id] ?? []).map((page) => [`${page.platform}:${page.id}`, { ...page, inherited: Boolean(parent) }]));
    for (const change of release.changes) {
        if (change.type === 'delete') pages.delete(`${change.platform ?? 'manage'}:${change.pageId}`);
        else pages.set(`${change.platform ?? 'manage'}:${change.pageId}`, { id: change.pageId, title: change.pageTitle, path: change.page, module: change.module, platform: change.platform ?? 'manage', inherited: false });
    }
    return [...pages.values()];
}
export function parallelConflicts(release: Release, releases: Release[]) {
    if (!release.baseline) return [];
    const pages = new Set(release.changes.map(change => `${change.platform ?? 'manage'}:${change.pageId}`));
    return releases.filter((item) => item.id !== release.id && item.baseline === release.baseline && item.status === 'in_progress')
        .flatMap((item) => [...new Set(item.changes.filter((change) => pages.has(`${change.platform ?? 'manage'}:${change.pageId}`)).map((change) => change.pageId))].map((pageId) => ({ version: item.id, pageId })));
}
/** 固定历史只从自身快照读取，不回退到当前业务代码。 */
export function pageHref(release: Release, page: string, current: string): string | null {
    page = page.replace(':version', encodeURIComponent(release.id));
    if (!page.startsWith('/') || page.startsWith('//') || page.includes('\\') || page.split('/').includes('..')) return null;
    if (release.id === current) return page;
    const fixedPage = release.pageSnapshots?.[page];
    if (fixedPage && /^\/releases\/[a-zA-Z0-9.-]+\/[a-zA-Z0-9/-]+$/.test(fixedPage)) return fixedPage;
    if (!release.snapshot || !/^\/releases\/[a-zA-Z0-9.-]+\/$/.test(release.snapshot)) return null;
    return release.snapshot + page.slice(1);
}
