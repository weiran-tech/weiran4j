import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type { IdResult, PageResult, RoleDetail, RoleOption, RoleQuery, RoleSaveRequest, RoleView } from '@/types/api';

export const roleKeys = {
    all: ['roles'] as const,
    list: (q: RoleQuery) => ['roles', 'list', q] as const,
    detail: (id: number) => ['roles', 'detail', id] as const,
    options: ['roles', 'options'] as const,
};

export function useRoleList(query: RoleQuery) {
    return useQuery({
        queryKey: roleKeys.list(query),
        queryFn: () => http.get<PageResult<RoleView>>(`/api/roles${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useRoleDetail(id: number | null) {
    return useQuery({
        queryKey: roleKeys.detail(id ?? 0),
        queryFn: () => http.get<RoleDetail>(`/api/roles/${id}`),
        enabled: id !== null,
        staleTime: 0,
    });
}

export function useRoleOptions() {
    return useQuery({
        queryKey: roleKeys.options,
        queryFn: () => http.get<RoleOption[]>('/api/roles/options'),
        staleTime: LOOKUP_STALE_TIME,
    });
}

export function useSaveRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: RoleSaveRequest }) =>
            id === undefined ? http.post<IdResult>('/api/roles', body) : http.put<null>(`/api/roles/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useDeleteRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/roles/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: roleKeys.all }),
    });
}

export function useAssignRoleMenus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, menuIds }: { id: number; menuIds: number[] }) => http.put<null>(`/api/roles/${id}/menus`, { menuIds }),
        onSuccess: (_d, v) => qc.invalidateQueries({ queryKey: roleKeys.detail(v.id) }),
    });
}
