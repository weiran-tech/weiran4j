import { render, renderHook, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import { Permission } from '@/components/Permission';
import { checkPermission, PermissionContext, usePermission } from '../usePermission';

function wrapper(permissions: string[]) {
    return function Wrapper({ children }: { children: ReactNode }) {
        return <PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider>;
    };
}

describe('usePermission', () => {
    it('按权限码精确匹配', () => {
        const { result } = renderHook(() => usePermission(), { wrapper: wrapper(['system:user:list']) });
        expect(result.current.hasPermission('system:user:list')).toBe(true);
        expect(result.current.hasPermission('system:user:create')).toBe(false);
        expect(result.current.hasAnyPermission('system:user:create', 'system:user:list')).toBe(true);
    });

    it('含 * 视为拥有全部权限', () => {
        const { result } = renderHook(() => usePermission(), { wrapper: wrapper(['*']) });
        expect(result.current.hasPermission('anything:at:all')).toBe(true);
        expect(result.current.hasAnyPermission('a', 'b')).toBe(true);
    });

    it('没有 Provider 时默认无权限', () => {
        const { result } = renderHook(() => usePermission());
        expect(result.current.hasPermission('system:user:list')).toBe(false);
    });

    it('checkPermission 纯函数', () => {
        expect(checkPermission(['*'], 'x')).toBe(true);
        expect(checkPermission([], 'x')).toBe(false);
    });
});

describe('<Permission>', () => {
    it('有权限才渲染子元素，否则渲染 fallback', () => {
        render(
            <PermissionContext.Provider value={['system:role:create']}>
                <Permission code="system:role:create">
                    <button type="button">新增角色</button>
                </Permission>
                <Permission code="system:role:delete" fallback={<span>无删除权限</span>}>
                    <button type="button">删除</button>
                </Permission>
            </PermissionContext.Provider>,
        );
        expect(screen.getByText('新增角色')).toBeInTheDocument();
        expect(screen.queryByText('删除')).not.toBeInTheDocument();
        expect(screen.getByText('无删除权限')).toBeInTheDocument();
    });
});
