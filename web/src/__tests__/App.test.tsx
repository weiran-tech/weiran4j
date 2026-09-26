import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { getToken, setToken } from '@/utils/token';

const me: CurrentUserView = {
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    email: null,
    phone: null,
    avatar: null,
    gender: 'male',
    departmentId: 1,
    departmentName: '总公司',
    roles: ['super_admin'],
    permissions: ['*'],
};

const menuBase = {
    parentId: 0,
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
    { ...menuBase, id: 1, title: '首页', type: 'menu', path: '/dashboard', component: 'dashboard/DashboardPage', icon: 'LayoutDashboard' },
    {
        ...menuBase,
        id: 2,
        title: '系统管理',
        type: 'directory',
        path: '/system',
        icon: 'Settings',
        children: [
            { ...menuBase, id: 20, parentId: 2, title: '尚未实现', type: 'menu', path: '/system/todo', component: 'system/todo/TodoPage' },
        ],
    },
];

describe('App 路由', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('未登录访问受保护路由跳到 /login?redirect=', async () => {
        mockFetch({});
        renderWithProviders(<App />, { route: '/system/users' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('已登录：按菜单渲染侧边栏与首页', async () => {
        setToken('t');
        mockFetch({ 'GET /api/auth/me': me, 'GET /api/auth/menus': menus, 'GET /api/dicts/code/sys_user_gender/items': [] });
        renderWithProviders(<App />, { route: '/' });
        expect(await screen.findByText(/欢迎使用/)).toBeInTheDocument();
        expect(screen.getAllByText('系统管理').length).toBeGreaterThan(0);
    });

    it('菜单组件在前端不存在时渲染占位而不崩溃', async () => {
        setToken('t');
        mockFetch({ 'GET /api/auth/me': me, 'GET /api/auth/menus': menus });
        renderWithProviders(<App />, { route: '/system/todo' });
        expect(await screen.findByText('页面不存在')).toBeInTheDocument();
        expect(screen.getByText(/system\/todo\/TodoPage/)).toBeInTheDocument();
    });

    it('未知路径渲染 404', async () => {
        setToken('t');
        mockFetch({ 'GET /api/auth/me': me, 'GET /api/auth/menus': menus });
        renderWithProviders(<App />, { route: '/no/such/page' });
        expect(await screen.findByText('404 页面不存在')).toBeInTheDocument();
    });

    it('/api/auth/me 返回 40100 时清令牌回登录页', async () => {
        setToken('expired');
        mockFetch({
            'GET /api/auth/me': () => Response.json({ code: 40100, message: '登录已失效', data: null }, { status: 401 }),
            'GET /api/auth/menus': menus,
        });
        renderWithProviders(<App />, { route: '/dashboard' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
        expect(getToken()).toBeNull();
    });
});
