/** 拆分文件只在统一入口组装，业务代码继续使用完整版本对象。 */
export function assembleManifest(index, files) {
    if (!index || typeof index.current !== 'string' || !Object.hasOwn(index, 'activeVersion') || (index.activeVersion !== null && typeof index.activeVersion !== 'string') || Object.keys(index).some(key => !['current', 'activeVersion'].includes(key))) throw new Error('版本索引只允许 current、activeVersion');
    const versions = new Map(); const groups = new Map();
    for (const [path, data] of Object.entries(files).sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))) {
        const match = /(?:^|\/)versions\/(v\d+\.\d+(?:\.\d+)?)\/(version\.json|changes\/([a-z][\w-]*)\.json)$/.exec(path);
        if (!match || !data || typeof data !== 'object' || Array.isArray(data)) throw new Error(`版本文件格式或路径非法：${path}`);
        const version = match[1];
        if (match[2] === 'version.json') {
            if (data.id !== version || 'changes' in data || versions.has(version)) throw new Error(`版本元信息与目录不一致：${path}`);
            versions.set(version, data);
        } else {
            if (data.pageId !== match[3] || !Array.isArray(data.changes) || !data.changes.length || Object.keys(data).some(key => !['pageId', 'changes'].includes(key))) throw new Error(`页面分组与文件名不一致或为空：${path}`);
            const changes = data.changes.map(change => {
                if (!change || typeof change !== 'object' || Array.isArray(change) || 'pageId' in change) throw new Error(`CHG 应从分组继承 pageId：${path}`);
                return { ...change, pageId: data.pageId };
            });
            groups.set(version, [...(groups.get(version) ?? []), ...changes]);
        }
    }
    for (const id of groups.keys()) if (!versions.has(id)) throw new Error(`页面分组缺少版本元信息：${id}`);
    return { ...index, workflowSchema: 2, releases: [...versions.values()].sort((a, b) => b.id.localeCompare(a.id, 'en', { numeric: true })).map(version => ({ ...version, changes: (groups.get(version.id) ?? []).sort((a, b) => a.id.localeCompare(b.id, 'en', { numeric: true })) })) };
}
