import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/helpers';
import { TableActions, type TableAction } from '../TableActions';

const actions = (onEdit = vi.fn(), onDelete = vi.fn()): TableAction[] => [
    { key: 'edit', label: '编辑', permission: 'system:user:update', onClick: onEdit },
    { key: 'reset', label: '重置密码', permission: 'system:user:reset-password', onClick: vi.fn() },
    { key: 'delete', label: '删除', danger: true, confirm: { title: '确定删除该用户？' }, onClick: onDelete },
];

describe('TableActions', () => {
    it('平铺：按权限过滤，普通操作直接执行', () => {
        const onEdit = vi.fn();
        renderWithProviders(<TableActions actions={actions(onEdit)} />, { permissions: ['system:user:update'] });
        expect(screen.getByRole('button', { name: '编辑' })).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '重置密码' })).toBeNull();
        expect(screen.queryByRole('button', { name: /更多/ })).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: '编辑' }));
        expect(onEdit).toHaveBeenCalledOnce();
    });

    it('收起：只有一个「更多」按钮，菜单列出全部操作；需要确认的操作弹确认框后才执行', async () => {
        const onEdit = vi.fn();
        const onDelete = vi.fn();
        renderWithProviders(<TableActions actions={actions(onEdit, onDelete)} compact />);
        expect(screen.getAllByRole('button')).toHaveLength(1);
        fireEvent.click(screen.getByRole('button', { name: '更多操作' }));
        expect((await screen.findAllByRole('menuitem')).map((m) => m.textContent)).toEqual(['编辑', '重置密码', '删除']);

        fireEvent.click(screen.getByRole('menuitem', { name: '删除' }));
        expect(onDelete).not.toHaveBeenCalled();
        const ok = await screen.findByText('确定');
        fireEvent.click(ok.closest('button') as HTMLElement);
        await waitFor(() => expect(onDelete).toHaveBeenCalledOnce());
        expect(onEdit).not.toHaveBeenCalled();
    });

    it('全部无权限时不渲染', () => {
        const { container } = renderWithProviders(
            <TableActions actions={[{ key: 'edit', label: '编辑', permission: 'x:y', onClick: vi.fn() }]} compact />,
            { permissions: [] },
        );
        expect(container.querySelector('button')).toBeNull();
    });
});
