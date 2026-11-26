import { releases, currentVersion, productFor } from './catalog';
import type { ProductPage, Release } from './version-model';

/** 历史目录仍由原有基线合并器解析，管理视图不改写固定快照。 */
export const sourceReleases: Release[] = releases.map(release => ({
    ...release,
    status: release.status as Release['status'],
    changes: release.changes.map(change => ({ ...change, type: change.type === 'remove' ? 'delete' : change.type as 'add' | 'modify', platform: change.platform as 'manage' | 'mobile', pageId: change.pageId!, pageTitle: change.pageTitle!, module: change.platform === 'mobile' ? '手机端' : '管理端' })),
}));
export { currentVersion };
export function pagesForReview(release: Release): ProductPage[] {
    const pages = productFor(release.id).pages.map(page => ({ id: page.pageId, title: page.title, path: page.path, platform: page.platform as 'manage' | 'mobile', module: page.group || (page.platform === 'mobile' ? '手机端' : '管理端') }));
    const keys = new Set(pages.map(page => `${page.platform}:${page.id}`));
    return [...pages, ...release.changes.filter(change => !keys.has(`${change.platform ?? 'manage'}:${change.pageId}`)).map(change => ({ id: change.pageId, title: change.pageTitle, path: change.page, platform: change.platform ?? 'manage', module: change.module }))];
}
