import { createContext, useCallback, useContext, useMemo } from 'react';

/** 当前用户权限码；由 App 在拿到 /api/auth/me 后注入 */
export const PermissionContext = createContext<readonly string[]>([]);

/** 权限码列表含 `*`（超级管理员）视为拥有全部权限 */
export function checkPermission(permissions: readonly string[], code: string): boolean {
    return permissions.includes('*') || permissions.includes(code);
}

export function usePermission() {
    const permissions = useContext(PermissionContext);

    // 保持引用稳定，便于页面把 hasPermission 放进 useMemo 依赖
    const hasPermission = useCallback((code: string) => checkPermission(permissions, code), [permissions]);
    const hasAnyPermission = useCallback(
        (...codes: string[]) => codes.some((c) => checkPermission(permissions, c)),
        [permissions],
    );

    return useMemo(() => ({ permissions, hasPermission, hasAnyPermission }), [permissions, hasPermission, hasAnyPermission]);
}
