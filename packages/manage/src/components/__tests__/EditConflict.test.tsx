import { Modal } from '@douyinfe/semi-ui';
import { cleanup, act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { UserFormModal } from '@/pages/system/users/UserFormModal';
import { RoleFormModal } from '@/pages/system/roles/RoleFormModal';
import { SetUserAccountFieldModal } from '@/pages/system/users/SetUserAccountFieldModal';
import { RoleMenuSheet } from '@/pages/system/roles/RoleMenuSheet';
import { roleKeys } from '@/hooks/queries/roles';
import type { RoleView, UserView } from '@/types/api';

const user: UserView = { version: 7, id: 9, username: 'alice', nickname: '原昵称', phone: null, avatar: null, gender: 'unknown', status: 'enabled', isBuiltin: false, roleIds: [], roleNames: [], lastLoginAt: null, lastLoginIp: null, createdAt: '', updatedAt: '' };
const role: RoleView = { version: 7, id: 8, name: '原角色', code: 'editor', description: '', sort: 0, status: 'enabled', isBuiltin: false, userCount: 0, createdAt: '', updatedAt: '' };
const conflict = () => Response.json({ code: 100007, message: '数据已更新', data: null }, { status: 409 });
afterEach(() => { cleanup(); Modal.destroyAll(); vi.unstubAllGlobals(); });

it.each(['user', 'role', 'inline'] as const)('%s 冲突保留草稿和版本，取消或失败不丢输入，成功重载恢复', async (kind) => {
    let readFail = true;
    const path = kind === 'role' ? 'role/update/8' : kind === 'inline' ? 'user/updateAccountField/9' : 'user/update/9';
    const get = kind === 'role' ? 'role/get/8' : 'user/get/9';
    const { calls } = mockFetch({
        [`PUT /api-backend/system/${path}`]: conflict,
        [`GET /api-backend/system/${get}`]: () => readFail ? Response.json({ code: 100005, message: '失败' }, { status: 500 }) : kind === 'role' ? { ...role, version: 8, name: '最新角色' } : { ...user, version: 8, nickname: '最新昵称', username: 'latest' },
        'GET /api-backend/system/role/listOptions': [], 'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [],
    });
    const onClose = vi.fn();
    renderWithProviders(kind === 'user' ? <UserFormModal record={user} onClose={onClose} /> : kind === 'role' ? <RoleFormModal record={role} onClose={onClose} /> : <SetUserAccountFieldModal user={user} onClose={onClose} />);
    const field = kind === 'user' ? '昵称' : kind === 'role' ? '角色名称' : '用户名';
    const input = screen.getByRole('textbox', { name: field });
    fireEvent.change(input, { target: { value: 'draftvalue' } });
    const dialog = screen.getByRole('dialog');
    fireEvent.click(within(dialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')!);
    await screen.findByText(/当前输入已保留/);
    expect(input).toHaveValue('draftvalue');
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ version: 7 });
    expect(onClose).not.toHaveBeenCalled();
    expect(within(dialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '重新加载最新数据' }));
    fireEvent.click(screen.getByText('保留输入', { selector: '.semi-button-content' }).closest('button')!);
    expect(input).toHaveValue('draftvalue');
    await waitFor(() => expect(screen.queryByText('重新加载最新数据？')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新加载最新数据' }));
    fireEvent.click(screen.getByText('重新加载', { selector: '.semi-button-content' }).closest('button')!);
    await screen.findByText(/重新加载失败，输入仍已保留/);
    expect(input).toHaveValue('draftvalue');
    readFail = false;
    await waitFor(() => expect(screen.queryByText('重新加载最新数据？')).not.toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '重新加载最新数据' }));
    fireEvent.click(screen.getByText('重新加载', { selector: '.semi-button-content' }).closest('button')!);
    await waitFor(() => expect(screen.getByRole('textbox', { name: field })).toHaveValue(kind === 'role' ? '最新角色' : kind === 'inline' ? 'latest' : '最新昵称'));
    expect(screen.queryByText(/当前输入已保留/)).not.toBeInTheDocument();
});

it('菜单选择后背景刷新不更换旧草稿版本，冲突保留集合', async () => {
    const { calls } = mockFetch({
        'GET /api-backend/system/menu/list': [{ id: 3, title: '用户管理', type: 'menu', permission: null, children: [] }],
        'GET /api-backend/system/role/get/8': { ...role, menuIds: [] },
        'PUT /api-backend/system/role/assignMenus/8': conflict,
    });
    const { client } = renderWithProviders(<RoleMenuSheet role={role} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '全选' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '全选' }));
    await act(async () => { client.setQueryData(roleKeys.detail(8), { ...role, version: 8, menuIds: [] }); await Promise.resolve(); });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await screen.findByText(/当前输入已保留/);
    expect(calls.find((c) => c.method === 'PUT')?.body).toEqual({ version: 7, menuIds: [3] });
    expect(screen.getByText('已选 1 项')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
});

it('个人资料草稿不使用后台刷新的新版本，冲突保留输入', async () => {
    const { signIn } = await import('@/test/session');
    const { default: ProfilePage } = await import('@/pages/profile/ProfilePage');
    const { authKeys } = await import('@/hooks/queries/auth');
    signIn(2, 'csrf');
    const me = { version: 7, id: 2, username: 'alice', nickname: '原昵称', phone: null, avatar: null, gender: 'unknown', roles: [], permissions: [], hasPassword: true };
    let latest = me;
    const { calls } = mockFetch({
        'GET /api-backend/system/auth/getAuthorizationSnapshot': () => { const user = (() => latest)(); if (Object(user) instanceof Response) return user; return { user, menus: [], revision: '0' }; },
        'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [],
        'GET /api-backend/n/system/auth/listProviders': { passwordLoginEnabled: true, providers: [] },
        'GET /api-backend/system/auth/listIdentities': [],
        'PUT /api-backend/system/auth/updateProfile': conflict,
    });
    const { client } = renderWithProviders(<ProfilePage />);
    fireEvent.click(await screen.findByRole('button', { name: '修改昵称' }));
    fireEvent.change(screen.getByLabelText('昵称'), { target: { value: '未保存输入' } });
    await act(async () => { client.setQueryData([...authKeys.snapshot, '2.csrf'], { user: { ...me, version: 8, nickname: '远端修改' }, menus: [], revision: '1' }); await Promise.resolve(); });
    const dialog = screen.getByRole('dialog', { name: '修改个人信息' });
    fireEvent.click(within(dialog).getByText('确定', { selector: '.semi-button-content' }).closest('button')!);
    await screen.findByText(/当前输入已保留/);
    expect(screen.getByLabelText('昵称')).toHaveValue('未保存输入');
    expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ version: 7, nickname: '未保存输入' });
    latest = { ...me, version: 8, nickname: '远端修改' };
    fireEvent.click(within(dialog).getByRole('button', { name: '重新加载最新数据' }));
    fireEvent.click(screen.getByText('重新加载', { selector: '.semi-button-content' }).closest('button')!);
    await waitFor(() => expect(screen.getByLabelText('昵称')).toHaveValue('远端修改'));
    fireEvent.click(within(screen.getByRole('dialog', { name: '修改个人信息' })).getByText('取消', { selector: '.semi-button-content' }).closest('button')!);
    await waitFor(() => expect(screen.queryByRole('textbox', { name: '昵称' })).not.toBeInTheDocument());
    expect(screen.queryByText('放弃修改？')).not.toBeInTheDocument();
});
