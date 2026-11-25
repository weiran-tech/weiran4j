import { immutableErrors, validateCatalog } from './model.mjs';
export const equal = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
function canonical(value) { return Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])])) : value; }
export function releaseTransfer(release, base) { return { schemaVersion: 1, kind: 'prototype-release', base: base || null, release }; }
/** 三方合并：冲突未选择时保留当前值，不静默覆盖。数组按整字段确认。 */
export function mergeTransfer(value, current, choices = {}) {
    if (!value || typeof value !== 'object') throw new Error('请选择交接包或版本 JSON');
    const incoming = value.kind === 'prototype-release' ? [value.release] : value.releases || [value];
    if (!Array.isArray(incoming) || incoming.some((item) => !item || typeof item.id !== 'string')) throw new Error('版本文件结构无效');
    const conflicts = [];
    function merge(base, local, remote, path, stamped) {
        if (equal(local, remote) || equal(base, remote) && stamped) return local;
        if (equal(base, local) && stamped) return remote;
        if ([base, local, remote].every((item) => item && typeof item === 'object' && !Array.isArray(item))) {
            return Object.fromEntries([...new Set([...Object.keys(local), ...Object.keys(remote)])].map((key) => [key, merge(base[key], local[key], remote[key], `${path}.${key}`, stamped)]));
        }
        conflicts.push({ path, local, incoming: remote });
        return choices[path] === 'incoming' ? remote : local;
    }
    const releases = [...current.releases];
    for (const item of incoming) {
        const index = releases.findIndex((entry) => entry.id === item.id);
        if (index === -1) { releases.unshift(item); continue; }
        const base = value.kind === 'prototype-release' && value.base?.id === item.id ? value.base : value.base?.releases?.find((entry) => entry.id === item.id);
        if ((releases[index].status === 'finalized' || releases[index].supersededBy) && !equal(item, releases[index])) throw new Error(`已定稿版本 ${item.id} 不允许修改`);
        releases[index] = merge(base, releases[index], item, item.id, Boolean(base));
    }
    const catalog = { current: value.kind === 'prototype-release' ? value.release.id : value.current || incoming[0].id, releases };
    const errors = [...validateCatalog(catalog), ...immutableErrors(current, catalog)];
    if (errors.length) throw new Error(errors.join('\n'));
    return { catalog, conflicts };
}
