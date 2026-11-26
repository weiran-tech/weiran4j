import { pageConflicts } from './page-conflicts.mjs';
export const canDerive = (release) => ['finalized', 'completed'].includes(release?.status) && !release.supersededBy;
const canonical = (value) => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value;
export function conflictFingerprint(release, conflict) {
    return JSON.stringify(canonical({ baseline: release.baseline, platform: conflict.platform, pageId: conflict.pageId, versions: [{ id: release.id, changes: conflict.local }, { id: conflict.version, changes: conflict.remote }].sort((a, b) => a.id.localeCompare(b.id)) }));
}
export function unresolvedConflicts(release, releases, resolutions = []) {
    return pageConflicts(release, releases).filter((conflict) => !resolutions.some((record) => record.fingerprint === conflictFingerprint(release, conflict) && record.decision?.trim() && record.evidence?.trim()));
}
export function workErrors(release, releases, resolutions = []) {
    if (!release) return ['必须明确选择仓库中存在的目标版本'];
    if (release.supersededBy) return [`${release.id} 已由 ${release.supersededBy} 承接，只能阅读`];
    const errors = [];
    if (!['finalized', 'baseline', 'completed'].includes(release.status) && !release.baseline) errors.push(`${release.id} 必须先选择已评审定稿的版本作为基线`);
    if (!['finalized', 'completed'].includes(release.status) && release.baseline && !canDerive(releases.find((item) => item.id === release.baseline))) errors.push(`${release.id} 的基线必须已完成评审并定稿`);
    for (const conflict of unresolvedConflicts(release, releases, resolutions)) errors.push(`${release.id} 与 ${conflict.version} 存在未解决页面冲突：${conflict.platform}/${conflict.pageId}`);
    return errors;
}
