import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';
import type { IdResult, MenuNode, MenuSaveRequest } from '@/types/api';
import { authKeys } from './auth';

export const menuKeys = {
    all: ['menus'] as const,
    tree: ['menus', 'tree'] as const,
};

/** 全量菜单树（含按钮、含禁用），需要 system:menu:list */
export function useMenuTree(enabled = true) {
    return useQuery({
        queryKey: menuKeys.tree,
        queryFn: () => http.get<MenuNode[]>('/api/menus'),
        enabled,
    });
}

export function useSaveMenu() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id?: number | undefined; body: MenuSaveRequest }) =>
            id === undefined ? http.post<IdResult>('/api/menus', body) : http.put<null>(`/api/menus/${id}`, body),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: menuKeys.all });
            // 侧边栏也来自菜单表，一并刷新
            await qc.invalidateQueries({ queryKey: authKeys.menus });
        },
    });
}

export function useDeleteMenu() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api/menus/${id}`),
        onSuccess: async () => {
            await qc.invalidateQueries({ queryKey: menuKeys.all });
            await qc.invalidateQueries({ queryKey: authKeys.menus });
        },
    });
}
