import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { MenuNode, RoleView } from '@/types/api';
import RolesPage from '../RolesPage';

const editor: RoleView = {
    id: 2,
    name: '编辑',
    code: 'editor',
    description: '内容编辑',
    sort: 1,
    status: 'enabled',
    isBuiltin: false,
    userCount: 0,
    createdAt: '2026-09-01 00:00:00',
    updatedAt: '2026-09-01 00:00:00',
};

const menuBase = {
    path: null,
    component: null,
    icon: null,
    permission: null,
    sort: 0,
    visible: true,
    keepAlive: false,
    isExternal: false,
    status: 'enabled' as const,
    children: [],
};

const menus: MenuNode[] = [
    {
        ...menuBase,
        id: 2,
        parentId: 0,
        title: '系统管理',
        type: 'directory',
        children: [
            {
                ...menuBase,
                id: 3,
                parentId: 2,
                title: '用户管理',
                type: 'menu',
                path: '/system/users',
                children: [{ ...menuBase, id: 100, parentId: 3, title: '新增用户', type: 'button', permission: 'system:user:create' }],
            },
        ],
    },
];

describe('RolesPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('渲染角色列表', async () => {
        mockFetch({ 'GET /api/roles': page([editor]), 'GET /api/dicts/code/sys_common_status/items': [] });
        renderWithProviders(<RolesPage />);
        expect(await screen.findByText('editor')).toBeInTheDocument();
        expect(screen.getByText('内容编辑')).toBeInTheDocument();
    });

    it('分配权限：读取已有 menuIds，全选后 PUT 全量菜单 id', async () => {
        const { calls } = mockFetch({
            'GET /api/roles': page([editor]),
            'GET /api/dicts/code/sys_common_status/items': [],
            'GET /api/menus': menus,
            'GET /api/roles/2': { ...editor, menuIds: [2, 3] },
            'PUT /api/roles/2/menus': null,
        });
        renderWithProviders(<RolesPage />);
        await screen.findByText('editor');

        fireEvent.click(screen.getByRole('button', { name: '分配权限' }));
        expect(await screen.findByText('已选 2 项')).toBeInTheDocument();
        expect(screen.getByText('system:user:create')).toBeInTheDocument();

        fireEvent.click(screen.getByRole('button', { name: '全选' }));
        expect(screen.getByText('已选 3 项')).toBeInTheDocument();

        const sheet = screen.getByText('分配权限：编辑').closest('.semi-sidesheet') as HTMLElement;
        fireEvent.click(within(sheet).getByText('保存').closest('button')!);

        await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.path === '/api/roles/2/menus')).toBe(true));
        const put = calls.find((c) => c.method === 'PUT' && c.path === '/api/roles/2/menus');
        expect((put?.body as { menuIds: number[] }).menuIds.sort((a, b) => a - b)).toEqual([2, 3, 100]);
    });

    it('新增角色：编码不合规时不提交', async () => {
        const { calls } = mockFetch({ 'GET /api/roles': page([]), 'GET /api/dicts/code/sys_common_status/items': [] });
        renderWithProviders(<RolesPage />);
        fireEvent.click(await screen.findByRole('button', { name: '新增角色' }));
        const dialog = await screen.findByRole('dialog');
        fireEvent.change(within(dialog).getByLabelText('角色名称'), { target: { value: '审计员' } });
        fireEvent.change(within(dialog).getByLabelText('角色编码'), { target: { value: 'Bad-Code' } });
        fireEvent.click(within(dialog).getByText('确定').closest('button')!);

        expect(await within(dialog).findByText(/小写字母开头/)).toBeInTheDocument();
        expect(calls.some((c) => c.method === 'POST')).toBe(false);
    });
});
