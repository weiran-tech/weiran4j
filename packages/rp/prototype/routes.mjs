/** 当前页面命名空间；历史快照的页面映射仍使用归档时的原地址。 */
export function namespacePath(path) {
    const match = path.match(/^(\/[^?#]*)(.*)$/);
    if (!match) return path;
    const [, pathname, suffix] = match;
    for (const [before, after] of [['/prototype/manage', '/manage'], ['/prototype/refund-demo', '/manage/refund-demo'], ['/prototype/refund', '/manage/refund-demo'], ['/prototype', '/rp'], ['/dashboard', '/rp'], ['/biz', '/manage/biz'], ['/ops', '/manage/ops'], ['/system', '/manage/system'], ['/im', '/manage/im'], ['/profile', '/manage/profile'], ['/login', '/manage/login'], ['/403', '/manage/403'], ['/demo', '/manage/demo'], ['/logs', '/manage/logs'], ['/ops-goods', '/manage/ops-goods'], ['/ops-rebate', '/manage/ops-rebate'], ['/ops-users', '/manage/ops-users']]) {
        if (pathname === before || pathname.startsWith(before + '/')) return after + pathname.slice(before.length) + suffix;
    }
    return path;
}
export const versionBase = (version) => {
    if (!/^v[\w.-]+$/.test(version)) throw new Error('版本编号无效');
    return `/versions/${version}/`;
};
/** 首页和指南是全局入口，详情及业务页面才属于具体版本。 */
export function globalPath(path) {
    const url = new URL(namespacePath(path), 'https://prototype.invalid');
    if (url.pathname === '/rp') url.pathname = '/';
    if (url.pathname === '/versions/') url.pathname = '/versions';
    if (/^\/rp\/help(?:\/|$)/.test(url.pathname)) url.pathname = url.pathname.replace('/rp/help', '/help');
    if (!(url.pathname === '/' || url.pathname === '/versions' || /^\/help(?:\/|$)/.test(url.pathname) || url.pathname === '/rp' || url.pathname === '/rp/login' || /^\/rp\/help(?:\/|$)/.test(url.pathname) || /^\/docs(?:\/|$)/.test(url.pathname))) return null;
    if (url.pathname === '/') { url.search = ''; url.hash = ''; }
    else for (const key of ['version', 'scope', 'scene', 'step', 'scenario', 'change', 'review']) url.searchParams.delete(key);
    return url.pathname + url.search + url.hash;
}
/** 版本只有路径一个来源；显式切换时由调用方传入目标版本。 */
export function versionPath(path, version) {
    const url = new URL(namespacePath(path), 'https://prototype.invalid');
    url.searchParams.delete('version');
    return versionBase(version) + url.pathname.slice(1) + url.search + url.hash;
}
export function pathVersion(path) {
    return path.match(/^\/versions\/(v[\w.-]+)(?:\/|$)/)?.[1] ?? null;
}
/** 无版本入口兼容旧 version 参数；进入版本路径后参数不能覆盖路径。 */
export function versionEntryPath(path, version) {
    const canonical = namespacePath(path);
    if (globalPath(canonical) !== null) return null;
    if (/^\/(?:rp|manage|mobile)(?:[/?#]|$)/.test(canonical)) {
        const requested = new URL(canonical, 'https://prototype.invalid').searchParams.get('version');
        return versionPath(canonical, requested && /^v[\w.-]+$/.test(requested) ? requested : version);
    }
    return null;
}
/** 版本路径内只清除冗余参数；固定归档保持原样。 */
export function portalEntryPath(path, base) {
    if (base.startsWith('/releases/')) return null;
    const global = globalPath(path);
    if (global !== null) return base === '/' && global === path ? null : global;
    const version = pathVersion(base);
    if (!version || !new URL(path, 'https://prototype.invalid').searchParams.has('version')) return null;
    return versionPath(path, version);
}
