import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type {
    IdResult,
    PageResult,
    UserCreateRequest,
    UserAccountFieldUpdateRequest,
    UserOption,
    UserQuery,
    UserUpdateRequest,
    UserView,
} from '@/types/api';

export const userKeys = {
    all: ['users'] as const,
    list: (q: UserQuery) => ['users', 'list', q] as const,
    options: ['users', 'options'] as const,
};

export function useUserList(query: UserQuery) {
    return useQuery({
        queryKey: userKeys.list(query),
        queryFn: () => http.get<PageResult<UserView>>(`/api-backend/system/user/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useUserOptions() {
    return useQuery({
        queryKey: userKeys.options,
        queryFn: () => http.get<UserOption[]>('/api-backend/system/user/listOptions'),
        staleTime: LOOKUP_STALE_TIME,
    });
}

export function useSaveUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: number; body: UserUpdateRequest } | { id?: undefined; body: UserCreateRequest }) =>
            args.id === undefined
                ? http.post<IdResult>('/api-backend/system/user/create', args.body)
                : http.put<null>(`/api-backend/system/user/update/${args.id}`, args.body),
        onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
    });
}

export function useDeleteUser() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/system/user/delete/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
    });
}

export function useResetUserPassword() {
    return useMutation({
        mutationFn: ({ id, password }: { id: number; password: string }) =>
            http.put<null>(`/api-backend/system/user/updatePassword/${id}`, { password }),
    });
}

export function useSetUserAccountField() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: number; body: UserAccountFieldUpdateRequest }) =>
            http.put<null>(`/api-backend/system/user/updateAccountField/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: userKeys.all }),
    });
}
