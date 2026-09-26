import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import { useToken } from '@/utils/token';
import type { CurrentUserView, MenuNode, PasswordChangeRequest, ProfileUpdateRequest } from '@/types/api';

export const authKeys = {
    me: ['auth', 'me'] as const,
    menus: ['auth', 'menus'] as const,
};

export function useMe() {
    const token = useToken();
    return useQuery({
        queryKey: [...authKeys.me, token],
        queryFn: () => http.get<CurrentUserView>('/api/auth/me', { silent: true }),
        enabled: !!token,
        staleTime: Infinity,
    });
}

export function useMyMenus() {
    const token = useToken();
    return useQuery({
        queryKey: [...authKeys.menus, token],
        queryFn: () => http.get<MenuNode[]>('/api/auth/menus', { silent: true }),
        enabled: !!token,
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
