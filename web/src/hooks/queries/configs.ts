import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type { ConfigQuery, ConfigSaveRequest, ConfigView, IdResult, PageResult } from '@/types/api';

export const configKeys = {
    all: ['configs'] as const,
    list: (q: ConfigQuery) => ['configs', 'list', q] as const,
};

export function useConfigList(query: ConfigQuery) {
    return useQuery({
        queryKey: configKeys.list(query),
        queryFn: () => http.get<PageResult<ConfigView>>(`/api/configs${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useSaveConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: ConfigSaveRequest }) =>
            id === undefined ? http.post<IdResult>('/api/configs', body) : http.put<null>(`/api/configs/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
    });
}

export function useDeleteConfig() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/configs/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: configKeys.all }),
    });
}
