import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import { systemMediaKeys } from '@/hooks/queries/system-media';
import { http } from '@/utils/request';
import type {
    ConfigGroupSaveRequest,
    ConfigGroupUpdateRequest,
    ConfigGroupView,
    ConfigQuery,
    ConfigSaveRequest,
    ConfigView,
    IdResult,
    PageResult,
} from '@/types/api';

export const configKeys = {
    all: ['configs'] as const,
    list: (q: ConfigQuery) => ['configs', 'list', q] as const,
};

export function useConfigList(query: ConfigQuery) {
    return useQuery({
        queryKey: configKeys.list(query),
        queryFn: () => http.get<PageResult<ConfigView>>(`/api-backend/system/config/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useConfigAll() {
    return useQuery({
        queryKey: [...configKeys.all, 'all'] as const,
        queryFn: () => http.get<ConfigView[]>('/api-backend/system/config/listAll'),
    });
}

export function useConfigGroups() {
    return useQuery({
        queryKey: [...configKeys.all, 'groups'] as const,
        queryFn: () => http.get<ConfigGroupView[]>('/api-backend/system/config/listGroups'),
    });
}

export function useCreateConfigGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: ConfigGroupSaveRequest) => http.post<IdResult>('/api-backend/system/config/createGroup', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...configKeys.all, 'groups'] }),
    });
}

export function useUpdateConfigGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, body, groupKey }: { key: string; body: ConfigGroupUpdateRequest; groupKey?: string }) =>
            http.put<null>(`/api-backend/system/config/updateGroup/${key}${groupKey === 'config_sms' ? '?groupKey=config_sms' : ''}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: [...configKeys.all, 'groups'] }),
    });
}

export function useDeleteConfigGroup() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ key, groupKey }: { key: string; groupKey?: string }) =>
            http.delete<null>(`/api-backend/system/config/deleteGroup/${key}${groupKey === 'config_sms' ? '?groupKey=config_sms' : ''}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
    });
}

export function useSaveConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: ConfigSaveRequest }) =>
            id === undefined
                ? http.post<IdResult>('/api-backend/system/config/create', body)
                : http.put<null>(`/api-backend/system/config/update/${id}`, body),
        onSuccess: () => {
            void qc.invalidateQueries({ queryKey: configKeys.all });
            void qc.invalidateQueries({ queryKey: systemMediaKeys.uploadSettings });
        },
    });
}

export function useDeleteConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/system/config/delete/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
    });
}
