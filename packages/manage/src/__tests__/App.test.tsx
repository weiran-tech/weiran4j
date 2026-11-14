import * as registry from '@/utils/page-registry';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { signIn } from '@/test/session';
import { getSession } from '@/utils/session';

const me: CurrentUserView = { version: 0,
    id: 1,
    username: 'admin',
    nickname: '超级管理员',
    phone: null,
    avatar: null,
    gender: 'male',
    roles: ['super_admin'],
    permissions: ['*'],
    hasPassword: true,
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
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    it('未登录访问受保护路由跳到 /login?redirect=', async () => {
        mockFetch({});
        renderWithProviders(<App />, { route: '/system/users' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('已登录：按菜单渲染侧边栏与首页', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus, 'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [] });
        renderWithProviders(<App />, { route: '/' });
        expect(await screen.findByText(/欢迎使用/)).toBeInTheDocument();
        expect(screen.getAllByText('系统管理').length).toBeGreaterThan(0);
    });

    it('菜单组件在前端不存在时渲染占位而不崩溃', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus });
        renderWithProviders(<App />, { route: '/system/todo' });
        expect(await screen.findByText('页面不存在')).toBeInTheDocument();
        expect(screen.getByText(/system\/todo\/TodoPage/)).toBeInTheDocument();
    });

    it('未知路径渲染 404', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus });
        renderWithProviders(<App />, { route: '/no/such/page' });
        expect(await screen.findByText('404 页面不存在')).toBeInTheDocument();
    });

    it('已移除的演示地址保持 404', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus });
        renderWithProviders(<App />, { route: '/system/components-demo' });
        expect(await screen.findByText('404 页面不存在')).toBeInTheDocument();
    });

    it('/api-backend/system/auth/getCurrentUser 返回 100101 时清会话回登录页', async () => {
        signIn();
        mockFetch({
            'GET /api-backend/system/auth/getCurrentUser': () => Response.json({ code: 100101, message: '登录已失效', data: null }, { status: 401 }),
            'GET /api-backend/system/auth/listCurrentMenus': menus,
        });
        renderWithProviders(<App />, { route: '/dashboard' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
        expect(getSession()).toBeNull();
    });
});

describe('App 页面故障恢复接入', () => {
    afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

    it.each(['render', 'lazy'])('%s 故障保留真实后台导航，可重试和返回首页', async (mode) => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        signIn();
        let broken = true;
        function FailingPage() { if (broken && mode === 'render') throw new Error('private-error'); return <p>路由页面已恢复</p>; }
        const loader = vi.fn(() => broken && mode === 'lazy' ? Promise.reject(new Error('module failed')) : Promise.resolve({ default: FailingPage }));
        const original = registry.resolvePageLoader;
        vi.spyOn(registry, 'resolvePageLoader').mockImplementation((path) => path === 'system/roles/RolesPage' ? loader : original(path));
        mockFetch({
            'GET /api-backend/system/auth/getCurrentUser': me,
            'GET /api-backend/system/auth/getPreferences': {},
            'GET /api-backend/system/auth/listCurrentMenus': [menus[0], { ...menuBase, id: 21, title: '故障测试', type: 'menu', path: '/broken', component: 'system/roles/RolesPage', keepAlive: true }],
            'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [],
        });
        renderWithProviders(<App />, { route: '/broken' });
        await screen.findByRole('alert', { name: '页面加载失败' });
        expect(document.querySelector('.admin-layout')).toBeInTheDocument();
        expect(screen.queryByText('private-error')).not.toBeInTheDocument();
        broken = false;
        fireEvent.click(screen.getByRole('button', { name: '重试' }));
        expect(await screen.findByText('路由页面已恢复')).toBeInTheDocument();
        expect(loader).toHaveBeenCalledTimes(2);
    });

    it('未登录固定页面加载失败可在原地重试', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => undefined);
        const original = registry.resolvePageLoader;
        const loader = vi.fn().mockRejectedValueOnce(new Error('login module failed')).mockResolvedValue({ default: () => <p>登录页已恢复</p> });
        vi.spyOn(registry, 'resolvePageLoader').mockImplementation((path) => path === 'login/LoginPage' ? loader : original(path));
        mockFetch({});
        renderWithProviders(<App />, { route: '/login' });
        fireEvent.click(await screen.findByRole('button', { name: '重试' }));
        expect(await screen.findByText('登录页已恢复')).toBeInTheDocument();
        expect(loader).toHaveBeenCalledTimes(2);
    });
});
