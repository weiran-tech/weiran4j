import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { config } from '@/config';
import { http } from '@/utils/request';
import { useSession } from '@/utils/session';
import type { BindIdentityRequest, IdResult, ProvidersView, UserIdentityView } from '@/types/api';

/** 外部身份登录（契约 §6.1、§6.2，D-015） */
export const identityKeys = {
    providers: ['auth', 'providers'] as const,
    mine: ['auth', 'identities'] as const,
    ofUser: (userId: number) => ['users', userId, 'identities'] as const,
};

/** 提供方清单随部署配置变化，页面存活期间基本不变 */
const PROVIDERS_STALE_TIME = 10 * 60 * 1000;

/**
 * 已启用的外部身份提供方与密码登录开关（公开接口，登录页未登录时调用）。
 * 静默：接口失败时调用方按「无提供方、密码登录开启」降级，不弹错误。
 */
export function useProviders() {
    return useQuery({
        queryKey: identityKeys.providers,
        queryFn: () => http.get<ProvidersView>('/api/auth/providers', { silent: true }),
        staleTime: PROVIDERS_STALE_TIME,
    });
}

/** 本人已绑定的外部身份 */
export function useMyIdentities() {
    const session = useSession();
    return useQuery({
        queryKey: [...identityKeys.mine, session],
        queryFn: () => http.get<UserIdentityView[]>('/api/auth/identities'),
        enabled: !!session,
    });
}

/** 本人解绑；没有本地密码且只剩这一个时后端返回 40901，由 request 层 Toast */
export function useUnbindMyIdentity() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/auth/identities/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: identityKeys.mine }),
    });
}

/** 管理员查看某用户的外部身份（权限 system:user:identity） */
export function useUserIdentities(userId: number) {
    return useQuery({
        queryKey: identityKeys.ofUser(userId),
        queryFn: () => http.get<UserIdentityView[]>(`/api/users/${userId}/identities`),
    });
}

export function useBindUserIdentity(userId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: BindIdentityRequest) => http.post<IdResult>(`/api/users/${userId}/identities`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: identityKeys.ofUser(userId) }),
    });
}

export function useUnbindUserIdentity(userId: number) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (identityId: number) => http.delete<null>(`/api/users/${userId}/identities/${identityId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: identityKeys.ofUser(userId) }),
    });
}

/**
 * 外部登录 / 绑定的发起地址：页面用 `location.assign()` 整页跳过去（后端 302 到提供方，不能用 fetch）。
 * `redirect` 必须是站内路径；后端还会再做一次规范化，非法时按 `/` 处理。
 */
export function ssoAuthorizeUrl(providerId: string, { redirect, mode }: { redirect: string; mode: 'login' | 'bind' }): string {
    return `${config.apiBaseUrl}/api/auth/sso/${encodeURIComponent(providerId)}/authorize?redirect=${encodeURIComponent(redirect)}&mode=${mode}`;
}

/** 回调失败时 URL 上 `ssoError=<code>` 的提示文案（契约 §4、§6.1） */
export function ssoErrorMessage(code: string): string {
    switch (code) {
        case '40102':
            return '外部身份校验失败，请重新登录';
        case '40303':
            return '账号未开通，请联系管理员';
        case '40301':
            return '账号已禁用';
        case '40100':
            return '请先登录';
        case '40901':
            return '该外部账号已绑定其他用户';
        default:
            return `外部登录失败（错误码 ${code}）`;
    }
}
