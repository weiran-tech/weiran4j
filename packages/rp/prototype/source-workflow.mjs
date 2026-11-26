import { validPath } from './model.mjs';
export const matchesFile = (file, pattern) => new RegExp('^' + pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('**', '\u0000').replaceAll('*', '[^/]*').replaceAll('\u0000', '.*') + '$').test(file);
const implementation = file => /^(src|public)\//.test(file) && !/(^|\/)(__tests__|test)\//.test(file) && !/\.(test|spec)\.[^.]+$/.test(file) && !file.endsWith('.d.ts') && file !== 'src/test-setup.ts';
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const same = (a, b) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
export function validateSourceWorkflow(manifest, registry, files = [], previous) {
    const errors = []; const releases = manifest.releases ?? []; const pages = registry.pages ?? [];
    const active = releases.filter(item => item.status === 'in_progress');
    if (active.length > 1) errors.push('只允许一个进行中版本');
    if (active.length === 1 && (manifest.activeVersion !== active[0].id || manifest.current !== active[0].id)) errors.push('activeVersion 和 current 必须指向唯一进行中版本');
    if (!active.length && manifest.activeVersion != null) errors.push('无进行中版本时 activeVersion 必须为空');
    if (active.length === 1 && !/^[a-f0-9]{40}$/.test(active[0].editBase ?? '')) errors.push('进行中版本必须登记完整 editBase 提交');
    const keys = pages.map(page => `${page.platform}:${page.id}`);
    if (new Set(keys).size !== keys.length) errors.push('稳定页面编号重复');
    const paths = pages.filter(page => !page.retired).map(page => `${page.platform}:${page.path}`);
    if (new Set(paths).size !== paths.length) errors.push('页面路由重复');
    for (const page of pages) if (!page.id || !page.title || !['manage', 'mobile'].includes(page.platform) || !validPath(page.path) || !Array.isArray(page.files)) errors.push(`页面登记不完整：${page.id}`);
    for (const release of releases) {
        if (!['in_progress', 'completed'].includes(release.status)) errors.push(`版本状态非法：${release.id}`);
        if (release.baseline && releases.find(item => item.id === release.baseline)?.status !== 'completed') errors.push(`基线必须已完结：${release.id}`);
        if (release.status === 'completed' && !release.legacyStatus && release.baseline && !/^[a-f0-9]{40}$/.test(release.implementationRef ?? '')) errors.push(`完结版本必须冻结 implementationRef：${release.id}`);
        // 迁移前的历史说明保持原文；只对本轮及之后的记录核对稳定目录。
        if (release.status === 'in_progress' || !release.legacyStatus) for (const change of release.changes ?? []) {
            const page = pages.find(page => page.id === change.pageId && page.platform === change.platform);
            if (!page || page.path !== change.page) errors.push(`改动未关联稳定页面：${release.id}/${change.id}`);
            if (change.files?.some(pattern => ['*', '**', 'src/**', 'src/pages/**', 'src/mobile/**'].includes(pattern))) errors.push(`改动文件范围过宽：${release.id}/${change.id}`);
        }
    }
    if (previous && previous.workflowSchema !== 2) for (const old of previous.releases ?? []) {
        if (old.id === previous.current) continue;
        const next = releases.find(item => item.id === old.id);
        if (!same(next, { ...old, status: 'completed', legacyStatus: old.status })) errors.push(`迁移不得重写历史版本：${old.id}`);
    }
    if (previous?.workflowSchema === 2) for (const old of previous.releases ?? []) {
        const next = releases.find(item => item.id === old.id);
        if (old.status === 'completed' && !same(old, next)) errors.push(`已完结版本不可改写：${old.id}`);
        if (old.status === 'in_progress' && next?.status === 'completed' && !/^[a-f0-9]{40}$/.test(next.implementationRef ?? '')) errors.push(`完结版本必须冻结 implementationRef：${old.id}`);
        if (old.status === 'in_progress' && next?.status === 'in_progress' && (old.editBase !== next.editBase || old.editBaseTree !== next.editBaseTree)) errors.push(`进行中版本不可挪动 editBase：${old.id}`);
        if (old.legacyStatus !== next?.legacyStatus) errors.push(`不可修改历史迁移标记：${old.id}`);
    }
    const working = active.length === 1 && manifest.activeVersion === active[0].id ? active[0] : undefined;
    for (const file of files.filter(implementation)) {
        if (!working) { errors.push(`没有进行中版本，禁止修改页面实现：${file}`); continue; }
        const related = pages.filter(page => page.files.some(pattern => matchesFile(file, pattern)));
        const changes = working.changes ?? [];
        if (related.length) {
            for (const page of related) if (!changes.some(change => change.pageId === page.id && change.platform === page.platform)) errors.push(`页面修改未登记本版 CHG：${page.id} (${file})`);
        } else if (!changes.some(change => change.files?.some(pattern => matchesFile(file, pattern)))) errors.push(`共享文件缺少受影响页面 CHG：${file}`);
    }
    return [...new Set(errors)];
}

export function frozenBaselineErrors(previous, current) {
    return Object.entries(previous).filter(([id, value]) => !same(value, current[id])).map(([id]) => `固定基线不可改写或删除：${id}`);
}
