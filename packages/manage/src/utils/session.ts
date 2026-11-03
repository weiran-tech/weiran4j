import { useSyncExternalStore } from 'react';

/**
 * 登录会话（契约 §4）。
 *
 * 访问令牌在 HttpOnly 的令牌 Cookie 里，JS 读不到也不需要读；前端能看到的只有
 * 非 HttpOnly 的 `weiran_csrf`（值 `<userId>.<随机串>`），它与令牌同时签发、同时清除，
 * 因此用它的有无代表「是否登录」，用它的值做写请求的 `X-CSRF-Token`。
 *
 * 做成可订阅的外部 store：request 在会话失效时 clearSession()，
 * 订阅了 useSession() 的路由守卫立刻重渲染并跳去登录页，不需要整页刷新。
 */
export const CSRF_COOKIE = 'weiran_csrf';

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

/** 读 `weiran_csrf` 的值；没有、为空或 Cookie 不可用时返回 null */
export function getSession(): string | null {
    try {
        for (const part of document.cookie.split(';')) {
            const eq = part.indexOf('=');
            if (eq < 0 || part.slice(0, eq).trim() !== CSRF_COOKIE) continue;
            const value = decodeURIComponent(part.slice(eq + 1).trim());
            return value || null;
        }
    } catch {
        // document 不可用或值不是合法的 URI 编码：按未登录处理
    }
    return null;
}

/**
 * 只清本地会话标记并通知订阅方。HttpOnly 的令牌 Cookie JS 删不掉，
 * 由服务端登出接口清除（或到期失效）；它失去配对的 `weiran_csrf` 后写请求会被 CSRF 校验拒绝，
 * 前端也已视为未登录、不再发出受保护的请求。
 */
export function clearSession() {
    try {
        document.cookie = `${CSRF_COOKIE}=; Max-Age=0; Path=/`;
    } catch {
        // Cookie 不可用：仍要通知订阅方
    }
    emit();
}

/** 登录成功后调用：浏览器已按 Set-Cookie 写好会话，这里只通知订阅方重新读取 */
export function refreshSession() {
    emit();
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    // Cookie 变化没有事件：其它标签页登录 / 登出后，回到本页（获得焦点、变为可见）时重新读取
    const onVisibility = () => {
        if (document.visibilityState === 'visible') cb();
    };
    globalThis.addEventListener('focus', cb);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
        listeners.delete(cb);
        globalThis.removeEventListener('focus', cb);
        document.removeEventListener('visibilitychange', onVisibility);
    };
}

/** 订阅会话；快照是字符串，按值比较，Cookie 没变时不会重渲染 */
export function useSession(): string | null {
    return useSyncExternalStore(subscribe, getSession, () => null);
}

/**
 * 从会话值取当前用户 id（`<userId>.<随机串>` 的点前部分）。只用于本地缓存归属判断，
 * 不做任何鉴权（服务端会校验前缀与当前用户一致）。格式不对或不是正整数时返回 null。
 */
export function sessionUserId(session: string | null): number | null {
    if (!session) return null;
    const dot = session.indexOf('.');
    if (dot <= 0) return null;
    const head = session.slice(0, dot);
    if (!/^\d+$/.test(head)) return null;
    const id = Number(head);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}
