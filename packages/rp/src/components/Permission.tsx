import type { ReactNode } from 'react';
import { usePermission } from '@/hooks/usePermission';

interface PermissionProps {
    /** 权限码；传数组时满足任一即可 */
    code: string | readonly string[];
    children: ReactNode;
    /** 无权限时的替代内容，默认不渲染 */
    fallback?: ReactNode;
}

/** 按钮级权限：无权限时不渲染子元素 */
export function Permission({ code, children, fallback = null }: PermissionProps) {
    const { hasAnyPermission } = usePermission();
    const codes = typeof code === 'string' ? [code] : code;
    return <>{hasAnyPermission(...codes) ? children : fallback}</>;
}
