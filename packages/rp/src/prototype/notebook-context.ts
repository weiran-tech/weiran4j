import { namespacePath } from '../../prototype/routes.mjs';
import { productFor, releases } from './catalog';
import type { NotebookContext } from './version-notes';
export function notebookContext(version: string, path = location.pathname + location.hash, platform = path.includes('/mobile') ? 'mobile' : 'manage'): NotebookContext | null {
    const release = releases.find((item) => item.id === version);
    if (!release) return null;
    const pages = productFor(release).pages.filter((page) => !/^\/rp(?:\/|$)/.test(page.path) && page.pageId !== 'mobile-form').map((page) => ({ platform: page.platform, pageId: page.pageId, title: page.title, path: page.path, introduction: release.changes.find((change) => change.pageId === page.pageId && change.platform === page.platform)?.introduction || release.changes.find((change) => change.pageId === page.pageId && change.platform === page.platform)?.after || '', remark: release.changes.find((change) => change.pageId === page.pageId && change.platform === page.platform)?.remark || '' }));
    const pagePath = (value: string) => { const url = new URL(namespacePath(value), 'https://prototype.invalid'); return url.pathname + url.hash; };
    const current = pages.find((page) => page.platform === platform && pagePath(page.path) === pagePath(path));
    return { version, baseline: release.baseline, platform, page: path, pageId: current?.pageId, pageUrl: location.href, pages, ...(release.platformNotes ? { platformNotes: release.platformNotes } : {}) };
}
