import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import { refreshSession, useSession } from '@/utils/session';
import { unlockScreen } from '@/hooks/useLockScreen';
import type {
    CurrentUserView,
    BindPhoneRequest,
    FavoriteMenusSaveRequest,
    MenuNode,
    PasswordChangeRequest,
    LoginResult,
    PhoneLoginCodeRequest,
    PhoneLoginRequest,
    ProfileUpdateRequest,
    UpdateOwnUsernameRequest,
    VerifyPasswordRequest,
} from '@/types/api';

export const authKeys = {
    me: ['auth', 'me'] as const,
    menus: ['auth', 'menus'] as const,
    favoriteMenus: ['auth', 'favorite-menus'] as const,
};

/** 公开发送短信验证码；登录页负责校验手机号与展示错误。 */
export function useSendPhoneLoginCode() {
    return useMutation({
        mutationFn: (body: PhoneLoginCodeRequest) => http.post<null>('/api-backend/n/system/auth/sendPhoneCode', body, { silent: true }),
    });
}

/** 手机号验证码登录，成功后按密码登录相同的会话刷新流程处理。 */
export function usePhoneLogin() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: PhoneLoginRequest) => http.post<LoginResult>('/api-backend/n/system/auth/loginWithPhoneCode', body, { silent: true }),
        onSuccess: () => {
            qc.clear();
            unlockScreen();
            refreshSession();
        },
    });
}

export function useMe() {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.me, session],
        queryFn: () => http.get<CurrentUserView>('/api-backend/system/auth/getCurrentUser', { silent: true }),
        enabled: !!session,
        staleTime: Infinity,
    });
}

export function useMyMenus() {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.menus, session],
        queryFn: () => http.get<MenuNode[]>('/api-backend/system/auth/listCurrentMenus', { silent: true }),
        enabled: !!session,
        staleTime: Infinity,
    });
}

export function useUpdateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ProfileUpdateRequest) => http.put<null>('/api-backend/system/auth/updateProfile', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
    });
}

export function useUpdateOwnUsername() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: UpdateOwnUsernameRequest) => http.put<null>('/api-backend/system/auth/updateUsername', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
    });
}

/** 新手机号通过验证码后才写入个人资料。 */
export function useSendBindPhoneCode() {
    return useMutation({
        mutationFn: (phone: string) => http.post<null>('/api-backend/system/auth/sendBindPhoneCode', { phone }),
    });
}

export function useBindPhone() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: BindPhoneRequest) => http.put<null>('/api-backend/system/auth/bindPhone', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (body: PasswordChangeRequest) => http.put<null>('/api-backend/system/auth/updatePassword', body),
    });
}

/** 收藏的菜单 id（按收藏顺序；后端已过滤掉删除或无权访问的菜单） */
export function useFavoriteMenus(enabled = true) {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.favoriteMenus, session],
        queryFn: () => http.get<number[]>('/api-backend/system/auth/listFavoriteMenus', { silent: true }),
        enabled: enabled && !!session,
        staleTime: Infinity,
    });
}

/**
 * 全量保存收藏：乐观更新缓存，失败回滚到修改前并提示；
 * 同一 scope 串行发出（全量覆盖，乱序到达会让旧列表盖掉新列表）。
 * 有后续保存在排队时，前一次失败**不回滚**（否则会吞掉后一次的乐观值），刷新也只在最后一次结束后做，以服务端为准。
 */
export function useSaveFavoriteMenus() {
    const qc = useQueryClient();
    const session = useSession();
    const key = [...authKeys.favoriteMenus, session];
    const mutationKey = [...authKeys.favoriteMenus, 'save'];
    // 回调执行时本次保存仍在计数内：=== 1 表示没有别的保存在排队
    const isLast = () => qc.isMutating({ mutationKey }) <= 1;
    return useMutation({
        mutationKey,
        scope: { id: 'favorite-menus' },
        mutationFn: (menuIds: number[]) => http.put<null>('/api-backend/system/auth/updateFavoriteMenus', { menuIds } satisfies FavoriteMenusSaveRequest),
        onMutate: async (menuIds) => {
            await qc.cancelQueries({ queryKey: key });
            const previous = qc.getQueryData<number[]>(key);
            qc.setQueryData(key, menuIds);
            return { previous };
        },
        onError: (_err, _ids, ctx) => {
            if (isLast()) qc.setQueryData(key, ctx?.previous);
        },
        onSettled: () => (isLast() ? qc.invalidateQueries({ queryKey: key }) : undefined),
    });
}

/** 锁屏解锁：校验当前用户密码。错误码 110101 不清会话（见 utils/request.ts），由锁屏自己提示 */
export function useVerifyPassword() {
    return useMutation({
        mutationFn: (password: string) =>
            http.post<null>('/api-backend/system/auth/verifyPassword', { password } satisfies VerifyPasswordRequest, { silent: true }),
    });
}
