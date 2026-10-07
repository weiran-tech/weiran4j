import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import { useSession } from '@/utils/session';
import type {
    CurrentUserView,
    FavoriteMenusSaveRequest,
    MenuNode,
    PasswordChangeRequest,
    ProfileUpdateRequest,
    VerifyPasswordRequest,
} from '@/types/api';

export const authKeys = {
    me: ['auth', 'me'] as const,
    menus: ['auth', 'menus'] as const,
    favoriteMenus: ['auth', 'favorite-menus'] as const,
};

export function useMe() {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.me, session],
        queryFn: () => http.get<CurrentUserView>('/api/auth/me', { silent: true }),
        enabled: !!session,
        staleTime: Infinity,
    });
}

export function useMyMenus() {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.menus, session],
        queryFn: () => http.get<MenuNode[]>('/api/auth/menus', { silent: true }),
        enabled: !!session,
        staleTime: Infinity,
    });
}

export function useUpdateProfile() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ProfileUpdateRequest) => http.put<null>('/api/auth/profile', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: authKeys.me }),
    });
}

export function useChangePassword() {
    return useMutation({
        mutationFn: (body: PasswordChangeRequest) => http.put<null>('/api/auth/password', body),
    });
}

/** 收藏的菜单 id（按收藏顺序；后端已过滤掉删除或无权访问的菜单） */
export function useFavoriteMenus(enabled = true) {
    const session = useSession();
    return useQuery({
        queryKey: [...authKeys.favoriteMenus, session],
        queryFn: () => http.get<number[]>('/api/auth/favorite-menus', { silent: true }),
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
        mutationFn: (menuIds: number[]) => http.put<null>('/api/auth/favorite-menus', { menuIds } satisfies FavoriteMenusSaveRequest),
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

/** 锁屏解锁：校验当前用户密码。错误码 40101 不清会话（见 utils/request.ts），由锁屏自己提示 */
export function useVerifyPassword() {
    return useMutation({
        mutationFn: (password: string) =>
            http.post<null>('/api/auth/verify-password', { password } satisfies VerifyPasswordRequest, { silent: true }),
    });
}
