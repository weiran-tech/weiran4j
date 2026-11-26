import { namespacePath, versionBase } from './routes.mjs';
/** 版本说明契约：浏览器表单与 CI 共用同一份检查。 */
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const fieldLabels = { title: '标题', goal: '版本目标', date: '日期', location: '操作位置', before: '原来的行为', after: '修改后的行为', exceptions: '异常处理', rules: '业务规则', acceptance: '验收标准', previousPage: '修改前页面地址', nextPage: '修改后页面地址' };
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0;
export const validPath = (value) => typeof value === 'string' && /^\/(?!\/)/.test(value) && !/[\\\s]/.test(value) && !/%(?:2e|2f|5c)/i.test(value) && !value.split(/[/?#]/).includes('..');
export function validateCatalog(data) {
    const errors = [];
    if (!object(data) || !Array.isArray(data.releases)) return ['版本文件必须包含 releases 数组'];
    const ids = new Set();
    for (const release of data.releases) {
        if (!object(release)) { errors.push('版本必须是对象'); continue; }
        const prefix = typeof release.id === 'string' ? release.id : '未知版本';
        if (typeof release.id !== 'string' || !/^v[\w.-]+$/.test(release.id) || ids.has(release.id)) errors.push(`版本编号无效或重复：${prefix}`);
        ids.add(release.id);
        for (const field of ['title', 'goal', 'date']) if (!nonempty(release[field])) errors.push(`${prefix} 缺少${fieldLabels[field] || field}`);
        if (!/^\d{4}-\d{2}-\d{2}$/.test(release.date || '') || Number.isNaN(Date.parse(release.date))) errors.push(`${prefix} 日期无效`);
        if (!['draft', 'review', 'finalized', 'baseline', 'in_progress', 'completed'].includes(release.status)) errors.push(`${prefix} 状态无效`);
        if (release.sourceCommit !== null && (typeof release.sourceCommit !== 'string' || !/^[a-f0-9]{7,40}$/.test(release.sourceCommit))) errors.push(`${prefix} 源码提交无效`);
        if (release.platformNotes !== undefined && (!object(release.platformNotes) || Object.entries(release.platformNotes).some(([platform, note]) => !['manage', 'mobile'].includes(platform) || !object(note) || typeof note.introduction !== 'string' || typeof note.remark !== 'string'))) errors.push(`${prefix} 双端介绍与备注格式无效`);
        if (!Array.isArray(release.changes)) { errors.push(`${prefix} changes 必须为数组`); continue; }
        const changes = new Set();
        const pages = new Map();
        for (const change of release.changes) {
            if (!object(change)) { errors.push(`${prefix} 改动必须是对象`); continue; }
            const label = `${prefix}/${change.id || '未编号改动'}`;
            for (const field of ['introduction', 'remark']) if (change[field] !== undefined && typeof change[field] !== 'string') errors.push(`${label} ${field} 必须为文本`);
            if (typeof change.id !== 'string' || !/^CHG-\d+$/.test(change.id) || changes.has(change.id)) errors.push(`${label} 改动编号无效或重复`);
            changes.add(change.id);
            if (!['add', 'modify', 'remove'].includes(change.type)) errors.push(`${label} 类型无效`);
            if (!['manage', 'mobile'].includes(change.platform)) errors.push(`${label} 端无效`);
            for (const field of ['title', 'location', 'before', 'after', 'exceptions']) if (!nonempty(change[field])) errors.push(`${label} 缺少${fieldLabels[field] || field}`);
            if (!validPath(change.page)) errors.push(`${label} 页面路径无效`);
            if (typeof change.pageId !== 'string' || !/^[a-z][\w-]*$/.test(change.pageId)) errors.push(`${label} 页面编号无效`);
            if (!nonempty(change.pageTitle)) errors.push(`${label} 页面名称不能为空`);
            for (const field of ['previousPage', 'nextPage']) if (change[field] !== null && !validPath(change[field])) errors.push(`${label} ${fieldLabels[field]}无效`);
            const pair = pagePaths(change);
            if (!pair.before && !pair.after) errors.push(`${label} 修改前后页面不能同时为空`);
            if ((pair.after || pair.before) !== change.page) errors.push(`${label} page 必须对应修改后页面，删除页面时对应修改前页面`);
            const pageKey = `${change.platform}:${change.pageId || change.page}`;
            const mapping = JSON.stringify(pair);
            if (pages.has(pageKey) && pages.get(pageKey) !== mapping) errors.push(`${label} 同一页面的前后路径不一致`);
            pages.set(pageKey, mapping);
            for (const field of ['rules', 'acceptance']) if (!Array.isArray(change[field]) || !change[field].length || change[field].some((item) => !nonempty(item))) errors.push(`${label} 缺少${fieldLabels[field] || field}`);
        }
        if (['review', 'finalized'].includes(release.status) && JSON.stringify([release.title, release.goal, release.changes]).includes('请填写')) errors.push(`${prefix} 评审或定稿前必须填写模板占位内容`);
    }
    if (!ids.has(data.current)) errors.push('current 必须指向存在的版本');
    const byId = new Map(data.releases.filter(object).map((release) => [release.id, release]));
    for (const release of byId.values()) {
        if (release.supersededBy && (!ids.has(release.supersededBy) || release.supersededBy === release.id || release.status === 'finalized')) errors.push(`${release.id} 承接版本无效，已定稿历史不可标记承接`);
        if (release.baseline !== null && (!ids.has(release.baseline) || release.baseline === release.id)) errors.push(`${release.id} 基线无效`);
        if (release.baseline && byId.has(release.baseline) && !['finalized', 'baseline', 'completed'].includes(byId.get(release.baseline).status)) errors.push(`${release.id} 必须选择已定版的固定基线，不能继承工作草稿`);
        if (['review', 'finalized'].includes(release.status) && !release.changes.length && !release.baseline) errors.push(`${release.id} 无页面改动时必须指定完整产品基线`);
        if (release.id === data.current && release.supersededBy) errors.push('当前版本不能标记为已承接');
        const retired = new Set([release.id]); let successor = byId.get(release.supersededBy);
        while (successor) { if (retired.has(successor.id)) { errors.push(`${release.id} 承接循环`); break; } retired.add(successor.id); successor = byId.get(successor.supersededBy); }
        const seen = new Set([release.id]);
        let cursor = byId.get(release.baseline);
        while (cursor) { if (seen.has(cursor.id)) { errors.push(`${release.id} 基线形成循环`); break; } seen.add(cursor.id); cursor = byId.get(cursor.baseline); }
    }
    return errors;
}
function canonical(value) {
    if (Array.isArray(value)) return value.map(canonical);
    if (object(value)) return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical(value[key])]));
    return value;
}
export function immutableErrors(previous, current) {
    return (previous.releases || []).filter((release) => release.status === 'finalized' || release.supersededBy)
        .filter((release) => JSON.stringify(canonical(release)) !== JSON.stringify(canonical(current.releases?.find((item) => item.id === release.id))))
        .map((release) => `${release.status === 'finalized' ? '已定稿版本' : '已承接版本'} ${release.id} 不允许修改或删除，请新建版本`);
}
export function parseCatalog(value, previous) {
    const errors = validateCatalog(value);
    if (errors.length) throw new Error(errors.join('\n'));
    if (previous) errors.push(...immutableErrors(previous, value));
    if (errors.length) throw new Error(errors.join('\n'));
    return value;
}
export function pagePaths(change) {
    return { before: change.previousPage === undefined ? change.page : change.previousPage,
        after: change.nextPage === undefined ? (change.type === 'remove' ? null : change.page) : change.nextPage };
}
export function pageDiffs(release) {
    const pages = new Map();
    for (const change of release.changes) {
        const key = `${change.platform}:${change.pageId || change.page}`;
        if (!pages.has(key)) pages.set(key, { key, pageId: change.pageId || change.page, title: change.pageTitle || change.location, platform: change.platform, ...pagePaths(change), changes: [] });
        pages.get(key).changes.push(change);
    }
    return [...pages.values()];
}
/** 完整目录 = 固定基线 + 本版覆盖 - 删除，页面身份由 platform/pageId 确定。 */
export function completeProduct(releases, version, baselines = {}, seen = new Set()) {
    if (seen.has(version)) throw new Error(`完整页面清单存在基线循环：${version}`);
    const release = releases.find((item) => item.id === version);
    if (!release) return { pages: [], complete: false, reason: `找不到版本 ${version}` };
    const seed = baselines[version];
    if (seed) return { pages: seed.pages.map((page) => ({ ...page, key: `${page.platform}:${page.pageId}`, changedIn: version })), complete: true, reason: '' };
    const parent = release.baseline ? completeProduct(releases, release.baseline, baselines, new Set([...seen, version])) : { pages: [], complete: false, reason: '尚未登记固定基线的完整页面清单' };
    const pages = new Map(parent.pages.map((page) => [page.key, { ...page, path: release.routeSchema === 2 ? namespacePath(page.path) : page.path }]));
    for (const page of pageDiffs(release)) {
        // 兼容早期页面编号登记之前的路径；同一路径不能重复出现在完整目录。
        const before = release.routeSchema === 2 && page.before ? namespacePath(page.before) : page.before;
        for (const [key, previous] of pages) if (key !== page.key && previous.platform === page.platform && (previous.path === before || previous.path === page.after)) pages.delete(key);
        if (!page.after) pages.delete(page.key);
        else pages.set(page.key, { key: page.key, platform: page.platform, pageId: page.pageId, title: page.title, path: page.after, group: pages.get(page.key)?.group || (page.platform === 'mobile' ? '手机端页面' : '本版页面'), changedIn: release.id });
    }
    return { pages: [...pages.values()], complete: parent.complete, reason: parent.reason };
}
export function contextPath(base, path, version, changeId, scenario = 'normal', review = true) {
    if (!validPath(path) || !validPath(base)) throw new Error('原型地址无效');
    const url = new URL(base + path.replace(/^\//, ''), 'https://prototype.invalid');
    if (base.startsWith('/versions/')) url.searchParams.delete('version');
    else url.searchParams.set('version', version);
    if (changeId) url.searchParams.set('change', changeId);
    url.searchParams.set('scenario', ['normal', 'empty', 'failure'].includes(scenario) ? scenario : 'normal');
    if (review) url.searchParams.set('review', '1');
    return url.pathname + url.search + url.hash;
}
export function previewTarget(release, snapshots, runningVersion, runningBase, path, changeId, scenario = 'normal', review = true) {
    if (!path) return { url: null, reason: '此版本没有该页面', archived: false };
    if (!release) return { url: null, reason: '未选择版本', archived: false };
    const snapshot = snapshots.find((item) => release.id === runningVersion && item.kind === 'candidate' && item.prototypeVersion === release.id && item.base === runningBase) || snapshots.find((item) => item.version === release.id);
    if (snapshot) return { url: contextPath(snapshot.base, path, release.id, changeId, scenario, review), reason: '', archived: snapshot.kind !== 'working' };
    if (release.id === runningVersion) return { url: contextPath(runningBase.startsWith('/releases/') ? runningBase : versionBase(release.id), path, release.id, changeId, scenario, review), reason: '', archived: false };
    return { url: null, reason: '此版本尚未归档', archived: false };
}
export function mobilePageChanges(release, path, selectedId) {
    const changes = release?.changes.filter((change) => change.platform === 'mobile' && pagePaths(change).after?.split('?')[0] === path) || [];
    const selected = changes.find((change) => change.id === selectedId);
    return selected ? [selected, ...changes.filter((change) => change !== selected)] : changes;
}
export function blankChange(index = 1) {
    return { id: `CHG-${String(index).padStart(3, '0')}`, type: 'modify', title: '', platform: 'manage', pageId: '', pageTitle: '', page: '', previousPage: null, nextPage: null, location: '', before: '', after: '', rules: [''], exceptions: '', acceptance: [''] };
}
export function blankRelease(id, baseline) {
    return { id, routeSchema: 2, title: '', status: 'draft', baseline, date: new Date().toISOString().slice(0, 10), sourceCommit: null, goal: '', changes: [blankChange()] };
}
/** 沿声明的基线链回溯页面身份，禁止把非祖先版本当作相同页面。 */
export function baselinePagePath(releases, target, page, baselineId) {
    if (!baselineId) return { path: null, reason: '请选择基线版本' };
    let cursor = target;
    let path = page.after;
    const seen = new Set();
    while (cursor && !seen.has(cursor.id)) {
        if (cursor.id === baselineId) return { path, reason: path ? '' : '该版本没有此页面' };
        seen.add(cursor.id);
        const mapping = pageDiffs(cursor).find((item) => item.key === page.key);
        if (mapping) path = mapping.before;
        cursor = releases.find((item) => item.id === cursor.baseline);
    }
    return { path: null, reason: '所选版本不在此版本的历史基线中' };
}
