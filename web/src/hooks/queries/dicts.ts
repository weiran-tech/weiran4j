import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LOOKUP_STALE_TIME, toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type { DictItemSaveRequest, DictItemView, DictQuery, DictSaveRequest, DictView, IdResult, PageResult } from '@/types/api';

export const dictKeys = {
    all: ['dicts'] as const,
    list: (q: DictQuery) => ['dicts', 'list', q] as const,
    items: (dictId: number) => ['dicts', 'items', dictId] as const,
    byCode: (code: string) => ['dicts', 'code', code] as const,
};

export function useDictList(query: DictQuery) {
    return useQuery({
        queryKey: dictKeys.list(query),
        queryFn: () => http.get<PageResult<DictView>>(`/api/dicts${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useDictItems(dictId: number | null) {
    return useQuery({
        queryKey: dictKeys.items(dictId ?? 0),
        queryFn: () => http.get<DictItemView[]>(`/api/dicts/${dictId}/items`),
        enabled: dictId !== null,
    });
}

/** 按编码取启用的字典项（下拉/标签用），带 5 分钟缓存；失败静默，界面退化为显示原值 */
export function useDictItemsByCode(code: string) {
    return useQuery({
        queryKey: dictKeys.byCode(code),
        queryFn: () => http.get<DictItemView[]>(`/api/dicts/code/${encodeURIComponent(code)}/items`, { silent: true }),
        staleTime: LOOKUP_STALE_TIME,
    });
}

/** 字典项 → Select optionList */
export function useDictOptions(code: string) {
    const { data } = useDictItemsByCode(code);
    return (data ?? []).map((i) => ({ label: i.label, value: i.value }));
}

export function useSaveDict() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: DictSaveRequest }) =>
            id === undefined ? http.post<IdResult>('/api/dicts', body) : http.put<null>(`/api/dicts/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: dictKeys.all }),
    });
}

export function useDeleteDict() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/dicts/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: dictKeys.all }),
    });
}

export function useSaveDictItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ dictId, itemId, body }: { dictId: number; itemId?: number | undefined; body: DictItemSaveRequest }) =>
            itemId === undefined
                ? http.post<IdResult>(`/api/dicts/${dictId}/items`, body)
                : http.put<null>(`/api/dicts/${dictId}/items/${itemId}`, body),
        // 同时让按编码缓存的下拉/标签失效
        onSuccess: () => qc.invalidateQueries({ queryKey: dictKeys.all }),
    });
}

export function useDeleteDictItem() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ dictId, itemId }: { dictId: number; itemId: number }) =>
            http.delete<null>(`/api/dicts/${dictId}/items/${itemId}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: dictKeys.all }),
    });
}
