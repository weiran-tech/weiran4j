import { pageDiffs } from './model.mjs';

/** 同固定基线上的并行页面调整只是潜在冲突，不等同于源码冲突。 */
export function pageConflicts(release, releases) {
    if (!release.baseline || release.supersededBy) return [];
    const pages = pageDiffs(release);
    return releases.filter((other) => other.id !== release.id && other.baseline === release.baseline && !other.supersededBy && other.status !== 'baseline')
        .flatMap((other) => pageDiffs(other).flatMap((remote) => {
            const local = pages.find((page) => page.key === remote.key);
            return local ? [{ version: other.id, status: other.status, baseline: release.baseline, platform: local.platform, pageId: local.pageId, title: local.title, local: local.changes, remote: remote.changes }] : [];
        }));
}
