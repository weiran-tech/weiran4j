import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import type { UserView } from '@/types/api';
import UsersPage from '../UsersPage';

const admin: UserView = {
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    email: null,
    phone: '13800000000',
    avatar: null,
    gender: 'male',
    departmentId: 1,
    departmentName: '总公司',
    status: 'enabled',
    isBuiltin: true,
    roleIds: [1],
    roleNames: ['超级管理员'],
    lastLoginAt: '2026-09-26 10:00:00',
    lastLoginIp: '127.0.0.1',
    createdAt: '2026-09-01 00:00:00',
    updatedAt: '2026-09-01 00:00:00',
};

const alice: UserView = { ...admin, id: 2, username: 'alice', nickname: '爱丽丝', isBuiltin: false, roleIds: [2], roleNames: ['编辑'], gender: 'female' };

function baseRoutes() {
    return {
        'GET /api/users': page([admin, alice], 2),
        'GET /api/dicts/code/sys_user_gender/items': [
            { id: 1, dictId: 1, label: '男', value: 'male', color: 'blue', sort: 1, status: 'enabled', remark: null },
            { id: 2, dictId: 1, label: '女', value: 'female', color: 'pink', sort: 2, status: 'enabled', remark: null },
        ],
        'GET /api/dicts/code/sys_common_status/items': [],
        'GET /api/departments': [],
        'GET /api/roles/options': [
            { id: 1, name: '超级管理员', code: 'super_admin' },
            { id: 2, name: '编辑', code: 'editor' },
        ],
    };
}

describe('UsersPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('拉取分页列表并渲染用户、字典标签', async () => {
        const { calls } = mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />);

        expect(await screen.findByText('alice')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
        // 性别走字典 sys_user_gender 渲染成中文标签
        expect(await screen.findByText('女')).toBeInTheDocument();
        const listCall = calls.find((c) => c.path === '/api/users');
        expect(listCall?.search).toBe('?page=1&pageSize=20');
    });

    it('关键字查询带上 keyword 并回到第 1 页', async () => {
        const { calls } = mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        fireEvent.change(screen.getByPlaceholderText('用户名 / 昵称 / 手机'), { target: { value: 'ali' } });
        fireEvent.click(screen.getByRole('button', { name: '查询' }));

        await waitFor(() => expect(calls.some((c) => c.path === '/api/users' && c.search.includes('keyword=ali'))).toBe(true));
    });

    it('内置用户的删除按钮禁用；删除普通用户调用 DELETE', async () => {
        const { calls } = mockFetch({ ...baseRoutes(), 'DELETE /api/users/2': null });
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        const deleteButtons = screen.getAllByRole('button', { name: '删除' });
        expect(deleteButtons[0]).toBeDisabled();
        fireEvent.click(deleteButtons[1]!);

        const confirm = await screen.findByText('确定删除该用户？');
        const popup = confirm.closest('.semi-popconfirm') as HTMLElement;
        fireEvent.click(within(popup).getByRole('button', { name: /确定/ }));

        await waitFor(() => expect(calls.some((c) => c.method === 'DELETE' && c.path === '/api/users/2')).toBe(true));
    });

    it('新增用户：提交后 POST /api/users，请求体字段符合契约', async () => {
        const { calls } = mockFetch({ ...baseRoutes(), 'POST /api/users': { id: 3 } });
        renderWithProviders(<UsersPage />);
        await screen.findByText('alice');

        fireEvent.click(screen.getByRole('button', { name: '新增用户' }));
        const dialog = await screen.findByRole('dialog');
        const inputs = within(dialog);
        fireEvent.change(inputs.getByLabelText('用户名'), { target: { value: 'bob' } });
        fireEvent.change(inputs.getByLabelText('昵称'), { target: { value: '鲍勃' } });
        fireEvent.change(inputs.getByLabelText('初始密码'), { target: { value: 'secret123' } });
        // Modal 底部按钮在 jsdom 下按 role+name 匹配不到，按可见文字找
        fireEvent.click(inputs.getByText('确定').closest('button')!);

        await waitFor(() => expect(calls.some((c) => c.method === 'POST' && c.path === '/api/users')).toBe(true));
        const post = calls.find((c) => c.method === 'POST' && c.path === '/api/users');
        expect(post?.body).toMatchObject({
            username: 'bob',
            nickname: '鲍勃',
            password: 'secret123',
            status: 'enabled',
            roleIds: [],
            gender: 'unknown',
            departmentId: null,
        });
    });

    it('没有写权限时不显示新增与操作列', async () => {
        mockFetch(baseRoutes());
        renderWithProviders(<UsersPage />, { permissions: ['system:user:list'] });
        await screen.findByText('alice');
        expect(screen.queryByRole('button', { name: '新增用户' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '编辑' })).not.toBeInTheDocument();
    });
});
