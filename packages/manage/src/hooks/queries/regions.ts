import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Toast } from '@douyinfe/semi-ui';
import { config } from '@/config';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import type { RegionNode, RegionQuery, RegionSaveRequest, RegionView } from '@/types/api';
import { ApiError, CODE_UNAUTHORIZED, http } from '@/utils/request';
import { clearSession } from '@/utils/session';

const regionRootKeys = ['regions'] as const;

export const regionKeys = {
    all: regionRootKeys,
    tree: (query: RegionQuery = {}) => [...regionRootKeys, 'tree', query] as const,
    flat: (query: RegionQuery = {}) => [...regionRootKeys, 'flat', query] as const,
    detail: (id: number) => [...regionRootKeys, 'detail', id] as const,
    lookup: [...regionRootKeys, 'lookup'] as const,
};

export function useRegionTree(query: RegionQuery = {}) {
    return useQuery({
        queryKey: regionKeys.tree(query),
        queryFn: () => http.get<RegionNode[]>(`/api-backend/region/area/listTree${toQueryString(query)}`),
    });
}

export function useRegionFlat(query: RegionQuery = {}) {
    return useQuery({
        queryKey: regionKeys.flat(query),
        queryFn: () => http.get<RegionView[]>(`/api-backend/region/area/list${toQueryString(query)}`),
    });
}

export function useRegionDetail(id: number | null) {
    return useQuery({
        queryKey: regionKeys.detail(id ?? 0),
        queryFn: () => http.get<RegionView>(`/api-backend/region/area/get/${id}`),
        enabled: id !== null,
        staleTime: 0,
    });
}

export function useRegionLookup() {
    return useQuery({
        queryKey: regionKeys.lookup,
        queryFn: () => http.get<RegionNode[]>('/api-backend/region/area/getEnabledTree'),
        staleTime: LOOKUP_STALE_TIME,
    });
}

export function useSaveRegion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number; body: RegionSaveRequest }) =>
            id === undefined
                ? http.post<RegionView>('/api-backend/region/area/create', body)
                : http.put<RegionView>(`/api-backend/region/area/update/${id}`, body),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: regionKeys.all }),
    });
}

export function useDeleteRegion() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/region/area/delete/${id}`),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: regionKeys.all }),
    });
}

/** Download a UTF-8 CSV response while keeping the normal same-origin cookie session. */
export async function downloadRegionCsv(query: RegionQuery): Promise<void> {
    try {
        const response = await fetch(`${config.apiBaseUrl}/api-backend/region/area/export${toQueryString(query)}`, {
            credentials: 'same-origin',
            headers: { Accept: 'text/csv' },
        });
        if (!response.ok) {
            let message = `导出失败（HTTP ${response.status}）`;
            let code = -1;
            try {
                const error = (await response.json()) as { code?: unknown; message?: unknown };
                if (typeof error.message === 'string') message = error.message;
                if (typeof error.code === 'number') code = error.code;
            } catch {
                // Keep the HTTP status message when the error body is not JSON.
            }
            if (code === CODE_UNAUTHORIZED) clearSession();
            throw new ApiError(code, message, response.status);
        }
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = 'regions.csv';
        document.body.append(anchor);
        anchor.click();
        anchor.remove();
        window.setTimeout(() => URL.revokeObjectURL(url), 0);
    } catch (error) {
        const message = error instanceof Error ? error.message : '导出失败';
        Toast.error(message);
        throw error;
    }
}
