import { useLayoutEffect, useSyncExternalStore, type ComponentPropsWithoutRef, type ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { globalPath } from '../../prototype/routes.mjs';
import { runtimeBase, syncRuntimeLocation } from './runtime';

let mounted = 0;
function subscribe(callback: () => void) {
    const onPop = () => { syncRuntimeLocation(); callback(); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
}

/** 协作外壳不随版本重载；历史业务内容继续由固定归档提供。 */
export function PortalRouter({ children }: { children: ReactNode }) {
    const base = useSyncExternalStore(subscribe, () => runtimeBase);
    useLayoutEffect(() => { mounted++; return () => { mounted--; }; }, []);
    return <BrowserRouter basename={base} useTransitions={false}>{children}</BrowserRouter>;
}

/** 返回 false 时保留正常文档导航，固定归档绝不接管其他构建。 */
export function navigatePortal(path: string, replace = false): boolean {
    if (!mounted || runtimeBase.startsWith('/releases/')) return false;
    const url = new URL(path, window.location.href);
    if (url.origin === window.location.origin) { const canonical = globalPath(url.pathname + url.search + url.hash); if (canonical !== null) url.href = new URL(canonical, url.origin).href; }
    if (url.origin !== window.location.origin || !(url.pathname === '/' || url.pathname === '/versions' || /^\/help(?:\/|$)/.test(url.pathname) || /^\/(?:versions\/v[\w.-]+\/(?:rp|manage)|rp)(?:[/?#]|$)/.test(url.pathname))) return false;
    if (url.href === window.location.href) return true;
    const previous = window.history.state as { idx?: number } | null;
    const idx = (Number(previous?.idx) || 0) + (replace ? 0 : 1);
    const state = { usr: null, key: Math.random().toString(36).slice(2, 10), idx };
    window.history[replace ? 'replaceState' : 'pushState'](state, '', url.pathname + url.search + url.hash);
    syncRuntimeLocation();
    window.dispatchEvent(new PopStateEvent('popstate', { state }));
    return true;
}

/** 保留链接的复制、新窗口能力，普通点击使用协作外壳内导航。 */
export function PortalLink({ href = '', onClick, ...props }: ComponentPropsWithoutRef<'a'>) {
    return <a {...props} href={href} onClick={(event) => {
        onClick?.(event);
        if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || props.target && props.target !== '_self' || props.download !== undefined) return;
        if (navigatePortal(href)) event.preventDefault();
    }} />;
}
