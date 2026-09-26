import { useSyncExternalStore } from 'react';

/**
 * 访问令牌存储。
 *
 * 做成可订阅的外部 store：request 在 401 时 clearToken()，
 * 订阅了 useToken() 的路由守卫立刻重渲染并跳去登录页，不需要整页刷新。
 */
export const TOKEN_KEY = 'weiran_token';

const listeners = new Set<() => void>();

function emit() {
    listeners.forEach((l) => l());
}

function safeGet(): string | null {
    try {
        return localStorage.getItem(TOKEN_KEY);
    } catch {
        return null;
    }
}

export function getToken(): string | null {
    return safeGet();
}

export function setToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token);
    emit();
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    emit();
}

function subscribe(cb: () => void) {
    listeners.add(cb);
    // 其它标签页登出/登录时同步
    const onStorage = (e: StorageEvent) => {
        if (e.key === TOKEN_KEY) cb();
    };
    globalThis.addEventListener('storage', onStorage);
    return () => {
        listeners.delete(cb);
        globalThis.removeEventListener('storage', onStorage);
    };
}

export function useToken(): string | null {
    return useSyncExternalStore(subscribe, safeGet, () => null);
}
