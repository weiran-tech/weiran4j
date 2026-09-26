import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import { clearToken, setToken, useToken } from '@/utils/token';
import type { LoginRequest, LoginResult } from '@/types/api';
import { useMe } from './queries/auth';

/** 多页签持久化键；退出登录时一并清掉，避免下一个账号看到上一个人的页签 */
export const TABS_STORAGE_KEY = 'weiran_tabs';

/**
 * 认证状态：令牌 + 当前用户（/api/auth/me）+ 登录/退出。
 * me 走 TanStack Query 缓存，多处调用不会重复请求。
 */
export function useAuth() {
    const token = useToken();
    const qc = useQueryClient();
    const meQuery = useMe();

    const login = useCallback(async (body: LoginRequest) => {
        // 密码错误是 40101，不走会话失效分支；错误提示由登录页自己展示
        const res = await http.post<LoginResult>('/api/auth/login', body, { silent: true });
        qc.clear();
        setToken(res.accessToken);
        return res;
    }, [qc]);

    /** 只清本地状态（改密成功、令牌失效后用） */
    const clearSession = useCallback(() => {
        clearToken();
        try {
            sessionStorage.removeItem(TABS_STORAGE_KEY);
        } catch {
            // 隐私模式下 sessionStorage 可能不可用
        }
        qc.clear();
    }, [qc]);

    const logout = useCallback(async () => {
        try {
            await http.post<null>('/api/auth/logout', undefined, { silent: true });
        } catch {
            // 尽力通知服务端写登出日志；失败也照样清本地
        }
        clearSession();
    }, [clearSession]);

    return {
        token,
        isLoggedIn: !!token,
        user: meQuery.data ?? null,
        permissions: meQuery.data?.permissions ?? [],
        meQuery,
        login,
        logout,
        clearSession,
    };
}
