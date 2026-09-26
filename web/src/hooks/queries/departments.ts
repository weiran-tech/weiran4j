import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type { DepartmentNode, DepartmentSaveRequest, IdResult, Status } from '@/types/api';

export const departmentKeys = {
    all: ['departments'] as const,
    tree: (status?: Status) => ['departments', 'tree', status ?? 'all'] as const,
};

/** 部门树：管理页与下拉共用（只需登录） */
export function useDepartmentTree(status?: Status) {
    return useQuery({
        queryKey: departmentKeys.tree(status),
        queryFn: () => http.get<DepartmentNode[]>(`/api/departments${toQueryString({ status })}`),
        staleTime: LOOKUP_STALE_TIME,
    });
}

export function useSaveDepartment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: DepartmentSaveRequest }) =>
            id === undefined
                ? http.post<IdResult>('/api/departments', body)
                : http.put<null>(`/api/departments/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all }),
    });
}

export function useDeleteDepartment() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/departments/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: departmentKeys.all }),
    });
}
