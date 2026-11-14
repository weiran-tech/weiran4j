import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import { authKeys } from './auth';
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
        queryFn: () => http.get<PageResult<RoleView>>(`/api-backend/system/role/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useRoleDetail(id: number | null) {
    return useQuery({
        queryKey: roleKeys.detail(id ?? 0),
        queryFn: () => http.get<RoleDetail>(`/api-backend/system/role/get/${id}`),
        enabled: id !== null,
        staleTime: 0,
    });
}

export function useRoleOptions() {
    return useQuery({
        queryKey: roleKeys.options,
        queryFn: () => http.get<RoleOption[]>('/api-backend/system/role/listOptions'),
        staleTime: LOOKUP_STALE_TIME,
    });
}

export function useSaveRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: RoleSaveRequest }) =>
            id === undefined ? http.post<IdResult>('/api-backend/system/role/create', body) : http.put<null>(`/api-backend/system/role/update/${id}`, body),
        onSuccess: () => Promise.all([
            qc.invalidateQueries({ queryKey: roleKeys.all }),
            qc.invalidateQueries({ queryKey: authKeys.snapshot }),
        ]),
    });
}

export function useDeleteRole() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/system/role/delete/${id}`),
        onSuccess: () => Promise.all([
            qc.invalidateQueries({ queryKey: roleKeys.all }),
            qc.invalidateQueries({ queryKey: authKeys.snapshot }),
        ]),
    });
}

export function useAssignRoleMenus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, menuIds, version }: { id: number; menuIds: number[]; version: number }) => http.put<null>(`/api-backend/system/role/assignMenus/${id}`, { menuIds, version }),
        onSuccess: (_d, v) => Promise.all([
            qc.invalidateQueries({ queryKey: roleKeys.detail(v.id) }),
            qc.invalidateQueries({ queryKey: authKeys.snapshot }),
        ]),
    });
}
