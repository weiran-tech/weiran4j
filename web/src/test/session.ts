import { CSRF_COOKIE, clearSession, refreshSession } from '@/utils/session';

/**
 * 模拟已登录：写入会话 Cookie `weiran_csrf=<userId>.<nonce>`（浏览器收到登录响应的 Set-Cookie 后就是这样）并通知订阅方。
 * HttpOnly 的令牌 Cookie JS 本就读不到，测试里不需要模拟。返回写入的会话值，便于断言。
 */
export function signIn(userId = 1, nonce = 'test'): string {
    const value = `${userId}.${nonce}`;
    document.cookie = `${CSRF_COOKIE}=${value}; path=/`;
    refreshSession();
    return value;
}

/** 模拟退出：清掉会话 Cookie 并通知订阅方 */
export function signOut() {
    clearSession();
}
