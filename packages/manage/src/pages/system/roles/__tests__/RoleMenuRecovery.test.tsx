import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { roleKeys } from '@/hooks/queries/roles';
import type { RoleView } from '@/types/api';
import { RoleMenuSheet } from '../RoleMenuSheet';

const role: RoleView = { id: 2, code: 'editor', name: '编辑', description: '', sort: 1, status: 'enabled', isBuiltin: false, userCount: 0, createdAt: '', updatedAt: '' };
const menus = [{ id: 3, parentId: 0, title: '用户管理', type: 'menu', permission: null, children: [] }];
const failure = () => Response.json({ code: 100002, message: '读取失败', data: null }, { status: 500 });
afterEach(() => vi.unstubAllGlobals());

it.each(['菜单树', '角色详情'])('%s 失败禁止修改和保存，重试恢复勾选', async (label) => {
    let fail = true;
    const { calls } = mockFetch({
        'GET /api-backend/system/menu/list': () => fail && label === '菜单树' ? failure() : menus,
        'GET /api-backend/system/role/get/2': () => fail && label === '角色详情' ? failure() : { ...role, menuIds: [3] },
        'PUT /api-backend/system/role/assignMenus/2': null,
    });
    renderWithProviders(<RoleMenuSheet role={role} onClose={() => undefined} />);
    const alert = await screen.findByRole('alert', { name: `${label}加载失败` });
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByRole('button', { name: '全选' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    expect(calls.every((call) => call.method === 'GET')).toBe(true);
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
    expect(screen.getByText('已选 1 项')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ menuIds: [3] }));
});

it('成功加载的空权限可以明确保存', async () => {
    const { calls } = mockFetch({ 'GET /api-backend/system/menu/list': menus, 'GET /api-backend/system/role/get/2': { ...role, menuIds: [] }, 'PUT /api-backend/system/role/assignMenus/2': null });
    renderWithProviders(<RoleMenuSheet role={role} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ menuIds: [] }));
});

it('延迟返回详情时不能把缺失详情当成空权限', async () => {
    const { fn, calls } = mockFetch({ 'GET /api-backend/system/menu/list': menus });
    const original = fn.getMockImplementation()!;
    let resolve!: (value: Response) => void;
    fn.mockImplementation((input, init) => (typeof input === 'string' ? input : input instanceof URL ? input.href : input.url).endsWith('/role/get/2') ? new Promise<Response>((done) => { resolve = done; }) : original(input, init));
    renderWithProviders(<RoleMenuSheet role={role} onClose={() => undefined} />);
    await waitFor(() => expect(resolve).toBeDefined());
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(calls.every((call) => call.method === 'GET')).toBe(true);
    await act(async () => { resolve(Response.json({ code: 0, data: { ...role, menuIds: [3] } })); await Promise.resolve(); });
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
    expect(screen.getByText('已选 1 项')).toBeInTheDocument();
});

it('刷新失败保留用户的清空草稿，重试后仍可保存空权限', async () => {
    let fail = false;
    const { calls } = mockFetch({ 'GET /api-backend/system/menu/list': menus, 'GET /api-backend/system/role/get/2': () => fail ? failure() : { ...role, menuIds: [3] }, 'PUT /api-backend/system/role/assignMenus/2': null });
    const { client } = renderWithProviders(<RoleMenuSheet role={role} onClose={() => undefined} />);
    await waitFor(() => expect(screen.getByRole('button', { name: '清空' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '清空' }));
    fail = true;
    await act(async () => { await client.invalidateQueries({ queryKey: roleKeys.detail(2) }); });
    await screen.findByRole('alert', { name: '角色详情加载失败' });
    expect(screen.getByRole('button', { name: '保存' })).toBeDisabled();
    expect(screen.getByText('已选 0 项')).toBeInTheDocument();
    fail = false;
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(calls.find((call) => call.method === 'PUT')?.body).toEqual({ menuIds: [] }));
});
