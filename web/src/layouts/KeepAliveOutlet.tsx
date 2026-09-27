import { Activity, useEffect, useLayoutEffect, useRef, useState, type ReactElement } from 'react';
import { useOutlet } from 'react-router-dom';

/** 同时缓存的页面上限，超出淘汰最久没访问的 */
export const MAX_CACHED_PAGES = 10;

export interface CacheEntry {
    path: string;
    element: ReactElement | null;
    /** 页签「刷新」版本号；变化时丢弃旧实例重建 */
    version: number;
    /** 最近一次访问的顺序（LRU 淘汰依据） */
    used: number;
}

/**
 * 缓存的下一个状态（纯函数，渲染期调用）：当前页可缓存时入缓存 / 按版本重建 / 记一次访问；
 * 页签已关闭的释放；超上限淘汰最久没访问的（当前页不淘汰）。无变化时返回原数组（引用不变）。
 */
export function nextCache(
    cache: readonly CacheEntry[],
    current: { path: string; element: ReactElement | null; version: number; cacheable: boolean },
    openPaths: ReadonlySet<string>,
): readonly CacheEntry[] {
    let next = cache;
    const seq = cache.reduce((max, e) => Math.max(max, e.used), 0);
    if (current.cacheable) {
        const existing = cache.find((e) => e.path === current.path);
        if (!existing || existing.version !== current.version) {
            const entry = { path: current.path, element: current.element, version: current.version, used: seq + 1 };
            next = existing ? next.map((e) => (e === existing ? entry : e)) : [...next, entry];
        } else if (existing.used !== seq) {
            next = next.map((e) => (e === existing ? { ...e, used: seq + 1 } : e));
        }
    }
    const kept = next.filter((e) => e.path === current.path || openPaths.has(e.path));
    if (kept.length !== next.length) next = kept;
    if (next.length > MAX_CACHED_PAGES) {
        const drop = new Set(
            [...next]
                .filter((e) => e.path !== current.path)
                .sort((a, b) => a.used - b.used)
                .slice(0, next.length - MAX_CACHED_PAGES)
                .map((e) => e.path),
        );
        next = next.filter((e) => !drop.has(e.path));
    }
    return next;
}

interface KeepAliveOutletProps {
    /** 是否启用页面缓存（偏好 enablePageCache 且启用了多页签） */
    enabled: boolean;
    /** 菜单 keepAlive=true 的路径 */
    keepAlivePaths: ReadonlySet<string>;
    /** 当前打开的页签；缓存生命周期与页签一致，关页签即释放 */
    openPaths: ReadonlySet<string>;
    pathname: string;
    /** 页签「刷新」版本号：变化时重建对应页面 */
    refreshVersion: Record<string, number>;
    /** 非缓存页的路由切换动画 class（缓存页不参与动画） */
    animationClass?: string;
}

/**
 * 路由级页面缓存（移植自 mono4ts `KeepAliveOutlet`，对标 Vue keep-alive），基于 React 19 `<Activity>`：
 * - 白名单：只缓存菜单 keepAlive=true 的页面；
 * - 隐藏时 React 保留 state 与 DOM（display:none）并卸载 Effects（定时器、订阅自动暂停），切回时恢复；
 * - 关闭页签即释放；最多 10 个，LRU 淘汰；
 * - 页签「刷新」通过版本号重建；
 * - 共享滚动容器 `.admin-content` 的滚动位置按页保存 / 恢复。
 *
 * 与 mono4ts 的差异：缓存放在 state 里、渲染期按「根据 props 调整 state」更新，而不是在渲染期改 ref。
 */
export function KeepAliveOutlet({ enabled, keepAlivePaths, openPaths, pathname, refreshVersion, animationClass }: KeepAliveOutletProps) {
    const outlet = useOutlet();
    const version = refreshVersion[pathname] ?? 0;
    const cacheable = enabled && keepAlivePaths.has(pathname);
    const [cache, setCache] = useState<readonly CacheEntry[]>([]);

    const next = enabled ? nextCache(cache, { path: pathname, element: outlet, version, cacheable }, openPaths) : [];
    if (next !== cache && (next.length || cache.length)) setCache(next);

    // 共享滚动容器：滚动时按页记下（不能等离开后再读——那时旧页已 display:none，scrollTop 会被钳成 0），
    // 切换后在绘制前恢复：缓存页回到上次位置，其它页回到顶部
    const scrollTops = useRef(new Map<string, number>());
    const currentPath = useRef(pathname);
    useEffect(() => {
        const container = document.querySelector<HTMLElement>('.admin-content');
        if (!container) return undefined;
        const onScroll = () => scrollTops.current.set(currentPath.current, container.scrollTop);
        container.addEventListener('scroll', onScroll, { passive: true });
        return () => container.removeEventListener('scroll', onScroll);
    }, []);
    useLayoutEffect(() => {
        if (currentPath.current === pathname) return;
        currentPath.current = pathname;
        const container = document.querySelector<HTMLElement>('.admin-content');
        if (container) container.scrollTop = cacheable ? (scrollTops.current.get(pathname) ?? 0) : 0;
    }, [pathname, cacheable]);

    return (
        <>
            {next.map((entry) => (
                <Activity key={`${entry.path}:${entry.version}`} mode={entry.path === pathname ? 'visible' : 'hidden'}>
                    <div className="admin-page admin-page--cached">{entry.element}</div>
                </Activity>
            ))}
            {!cacheable && (
                <div key={`${pathname}:${version}`} className={`admin-page${animationClass ? ` ${animationClass}` : ''}`}>
                    {outlet}
                </div>
            )}
        </>
    );
}
