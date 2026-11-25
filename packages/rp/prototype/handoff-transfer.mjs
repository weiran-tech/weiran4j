import { equal } from './transfer.mjs';
/** 按 CHG / 验收条目合并，冲突默认保留本机，未选择不得导出就绪正文。 */
export function mergeHandoff(base, local, incoming, choices = {}) {
    if (local?.version !== incoming?.version || base && base.version !== local.version) throw new Error('交接包版本不匹配');
    const conflicts = [];
    function merge(before, mine, theirs, path) {
        if (equal(mine, theirs) || base && equal(before, theirs)) return mine;
        if (base && equal(before, mine)) return theirs;
        if ([mine, theirs].every((item) => item && typeof item === 'object' && !Array.isArray(item))) return Object.fromEntries([...new Set([...Object.keys(mine), ...Object.keys(theirs)])].map((key) => [key, merge(before?.[key], mine[key], theirs[key], `${path}.${key}`)]));
        if (Array.isArray(mine) && Array.isArray(theirs) && ['changes', 'acceptance'].some((field) => path.endsWith(`.${field}`))) {
            const key = path.endsWith('.changes') ? 'id' : 'text';
            if (mine.length !== theirs.length || mine.some((item) => !theirs.some((entry) => entry[key] === item[key]))) { conflicts.push({ path, local: mine, incoming: theirs }); return choices[path] === 'incoming' ? theirs : mine; }
            return mine.map((item, index) => merge(before?.find((entry) => entry[key] === item[key]), item, theirs.find((entry) => entry[key] === item[key]), `${path}.${item.id || index + 1}`));
        }
        conflicts.push({ path, local: mine, incoming: theirs });
        return choices[path] === 'incoming' ? theirs : mine;
    }
    return { value: merge(base, local, incoming, local.version), conflicts };
}
export function handoffTransfer(draft, base = null, updatedAt = null) { return { kind: 'prototype-handoff', schemaVersion: 1, version: draft.version, baseUpdatedAt: updatedAt, base, draft }; }
