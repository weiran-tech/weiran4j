import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import { clearSession as clearSessionCookie, refreshSession, useSession } from '@/utils/session';
import type { LoginRequest, LoginResult, LogoutResult } from '@/types/api';
import { useMe } from './queries/auth';
import { unlockScreen } from './useLockScreen';

/** 多页签持久化键；退出登录时一并清掉，避免下一个账号看到上一个人的页签 */
export const TABS_STORAGE_KEY = 'weiran_tabs';

/**
 * 认证状态：会话（`weiran_csrf` Cookie）+ 当前用户（/api/auth/me）+ 登录/退出。
 * me 走 TanStack Query 缓存，多处调用不会重复请求。
 */
export function useAuth() {
    const session = useSession();
    const qc = useQueryClient();
    const meQuery = useMe();

    const login = useCallback(async (body: LoginRequest) => {
        // 密码错误是 40101，不走会话失效分支；错误提示由登录页自己展示
        const res = await http.post<LoginResult>('/api/auth/login', body, { silent: true });
        qc.clear();
        // 会话过期被踢回登录页时锁屏标记还留着，重新登录后不应再锁
        unlockScreen();
        // 令牌已由浏览器按 Set-Cookie 写入 HttpOnly Cookie，这里只通知订阅方重新读取会话
        refreshSession();
        return res;
    }, [qc]);

    /** 只清本地状态（改密成功、会话失效后用）；锁屏状态一并解除 */
    const clearSession = useCallback(() => {
        clearSessionCookie();
        unlockScreen();
        try {
            sessionStorage.removeItem(TABS_STORAGE_KEY);
        } catch {
            // 隐私模式下 sessionStorage 可能不可用
        }
        qc.clear();
    }, [qc]);

    /**
     * 退出：通知服务端（写登出日志、清 Cookie）后清本地会话；
     * 会话来自配置了登出的外部身份提供方时，再整页跳到其登出地址（提供方登出后回跳 /login）。
     */
    const logout = useCallback(async () => {
        let ssoLogoutUrl: string | null = null;
        try {
            const res = await http.post<LogoutResult | null>('/api/auth/logout', undefined, { silent: true });
            ssoLogoutUrl = res?.ssoLogoutUrl ?? null;
        } catch {
            // 尽力通知服务端写登出日志；失败也照样清本地
        }
        clearSession();
        if (ssoLogoutUrl) window.location.assign(ssoLogoutUrl);
    }, [clearSession]);

    return {
        session,
        isLoggedIn: !!session,
        user: meQuery.data ?? null,
        permissions: meQuery.data?.permissions ?? [],
        meQuery,
        login,
        logout,
        clearSession,
    };
}
