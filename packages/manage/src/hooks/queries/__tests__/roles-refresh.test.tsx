import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useState } from 'react';
import { useAssignRoleMenus, useDeleteRole, useSaveRole } from '../roles';
import { useMe, useMyMenus } from '../auth';
import { PermissionContext } from '@/hooks/usePermission';
import { Permission } from '@/components/Permission';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { signIn } from '@/test/session';

type Action = 'create' | 'update' | 'delete' | 'assign';
const body = { name: '编辑', code: 'editor', description: '', sort: 1, status: 'enabled' as const };
function Harness({ action }: { action: Action }) {
    const me = useMe();
    const menus = useMyMenus();
    const save = useSaveRole();
    const remove = useDeleteRole();
    const assign = useAssignRoleMenus();
    const [result, setResult] = useState('');
    const write = async () => {
        try {
            if (action === 'delete') await remove.mutateAsync(2);
            else if (action === 'assign') await assign.mutateAsync({ id: 2, menuIds: [], version: 0 });
            else await save.mutateAsync({ ...(action === 'update' ? { id: 2 } : {}), body });
            setResult('写入成功');
        } catch { setResult('写入失败'); }
    };
    return <PermissionContext.Provider value={me.data?.permissions ?? []}>
        <nav aria-label="当前导航">{menus.data?.map((menu) => <span key={menu.id}>{menu.title}</span>)}</nav>
        <Permission code="system:user:create"><span>新增用户按钮</span></Permission>
        <button onClick={() => void write()}>执行变更</button><p>{result}</p>
    </PermissionContext.Provider>;
}
const endpoints: Record<Action, string> = {
    create: 'POST /api-backend/system/role/create', update: 'PUT /api-backend/system/role/update/2', delete: 'DELETE /api-backend/system/role/delete/2', assign: 'PUT /api-backend/system/role/assignMenus/2',
};
afterEach(() => vi.unstubAllGlobals());
it.each<Action>(['create', 'update', 'delete', 'assign'])('%s 成功后重取活动身份查询并更新导航及按钮', async (action) => {
    signIn();
    let changed = false;
    const { calls } = mockFetch({
        'GET /api-backend/system/auth/getPreferences': {},
        'GET /api-backend/system/auth/getAuthorizationSnapshot': () => { const user = (() => ({ id: 1, username: 'demo', permissions: changed ? [] : ['system:user:create'] }))(); if (Object(user) instanceof Response) return user; return { user, menus: (() => changed ? [] : [{ id: 3, title: '用户管理' }])(), revision: '0' }; },

        [endpoints[action]]: () => { changed = true; return action === 'create' ? { id: 2 } : null; },
    });
    renderWithProviders(<Harness action={action} />);
    expect(await screen.findByText('新增用户按钮')).toBeInTheDocument();
    expect(await screen.findByText('用户管理')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '执行变更' }));
    await screen.findByText('写入成功');
    expect(screen.queryByText('新增用户按钮')).not.toBeInTheDocument();
    expect(screen.queryByText('用户管理')).not.toBeInTheDocument();
    expect(calls.filter((call) => call.path.endsWith('/getAuthorizationSnapshot'))).toHaveLength(2);
});
it.each<Action>(['create', 'update', 'delete', 'assign'])('%s 失败不使身份失效或额外读取', async (action) => {
    signIn();
    const { calls } = mockFetch({
        'GET /api-backend/system/auth/getPreferences': {},
        'GET /api-backend/system/auth/getAuthorizationSnapshot': () => { const user = { id: 1, permissions: ['system:user:create'] }; if (Object(user) instanceof Response) return user; return { user, menus: [{ id: 3, title: '用户管理' }], revision: '0' }; },

        [endpoints[action]]: () => Response.json({ code: 100002, message: '写入失败', data: null }, { status: 500 }),
    });
    const { client } = renderWithProviders(<Harness action={action} />);
    await screen.findByText('新增用户按钮');
    await screen.findByText('用户管理');
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    fireEvent.click(screen.getByRole('button', { name: '执行变更' }));
    await waitFor(() => expect(screen.getByText('写入失败', { selector: 'p' })).toBeInTheDocument());
    expect(invalidate).not.toHaveBeenCalled();
    expect(screen.getByText('新增用户按钮')).toBeInTheDocument();
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(calls.filter((call) => call.path.endsWith('/getAuthorizationSnapshot')).map((call) => call.path)).toEqual(['/api-backend/system/auth/getAuthorizationSnapshot']);
});
