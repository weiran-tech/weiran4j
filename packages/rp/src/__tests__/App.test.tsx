import { screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLocation } from 'react-router-dom';
import { App } from '@/App';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { signIn } from '@/test/session';
import { getSession } from '@/utils/session';

const me: CurrentUserView = {
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
    { ...menuBase, id: 1, title: '首页', type: 'menu', path: '/rp', component: 'dashboard/DashboardPage', icon: 'LayoutDashboard' },
    {
        ...menuBase,
        id: 2,
        title: '系统管理',
        type: 'directory',
        path: '/manage/system',
        icon: 'Settings',
        children: [
            { ...menuBase, id: 20, parentId: 2, title: '尚未实现', type: 'menu', path: '/manage/system/todo', component: 'system/todo/TodoPage' },
        ],
    },
];

describe('App 路由', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('未登录访问受保护路由跳到 /login?redirect=', async () => {
        mockFetch({});
        renderWithProviders(<App />, { route: '/manage/system/users' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('主入口直接展示原型协作与文档入口', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus, 'GET /api-backend/system/dict/listItemsByCode/sys_user_gender': [] });
        renderWithProviders(<App />, { route: '/' });
        expect(await screen.findByRole('heading', { name: '让想法成为可体验、可评审的产品原型' })).toBeInTheDocument();
        expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '帮助文档' })).toHaveAttribute('aria-haspopup', 'true');
    });

    it('菜单组件在前端不存在时渲染占位而不崩溃', async () => {
        signIn();
        mockFetch({ 'GET /api-backend/system/auth/getCurrentUser': me, 'GET /api-backend/system/auth/listCurrentMenus': menus });
        renderWithProviders(<App />, { route: '/manage/system/todo' });
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
        renderWithProviders(<App />, { route: '/manage/system/components-demo' });
        expect(await screen.findByText('404 页面不存在')).toBeInTheDocument();
    });

    it('/api-backend/system/auth/getCurrentUser 返回 100101 时清会话回登录页', async () => {
        signIn();
        mockFetch({
            'GET /api-backend/system/auth/getCurrentUser': () => Response.json({ code: 100101, message: '登录已失效', data: null }, { status: 401 }),
            'GET /api-backend/system/auth/listCurrentMenus': menus,
        });
        renderWithProviders(<App />, { route: '/manage/system/todo' });
        expect(await screen.findByRole('button', { name: '登录' })).toBeInTheDocument();
        expect(getSession()).toBeNull();
    });
});

it('未登录可访问主入口、帮助文章和旧帮助链接', async () => {
    mockFetch({});
    const first = renderWithProviders(<App />, { route: '/' });
    expect(await screen.findByRole('heading', { name: '让想法成为可体验、可评审的产品原型' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument();
    first.unmount();
    renderWithProviders(<App />, { route: '/rp/help/product?version=v0.8' });
    expect(await screen.findByRole('heading', { name: '使用 AI 制作与演示原型' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument();
});


it.each(['/rp/versions', '/rp/workflow'])('未登录从 %s 查看版本详情，使用主页公共布局', async (route) => {
    const { calls } = mockFetch({});
    renderWithProviders(<App />, { route });
    expect(await screen.findByRole('heading', { name: /v0.8 ·/, level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '主导航' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: '版本导航' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '← 版本清单' })).toHaveAttribute('href', '/versions');
    expect(screen.queryByRole('button', { name: '登录' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '收起侧边栏' })).not.toBeInTheDocument();
    expect(calls.some((call) => call.path.startsWith('/api-backend/system/auth/'))).toBe(false);
});

it('旧原型演示地址合并到版本详情，保留版本、范围与端', async () => {
    mockFetch({});
    renderWithProviders(<App />, { route: '/rp/demo?version=v0.7&scope=all&platform=mobile' });
    expect(await screen.findByRole('heading', { name: /v0.7 · 四阶段协作/ })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '原型演示', level: 1 })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: '完整产品' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('radio', { name: '手机端' })).toBeChecked();
    expect(screen.getByRole('tab', { name: '原型与改动' })).toHaveAttribute('aria-selected', 'true');
});


it('旧对比链接移除专属参数，保留版本目录与改动说明', async () => {
    function LocationProbe() { const location = useLocation(); return <output aria-label="清理后参数">{location.search}</output>; }
    mockFetch({});
    renderWithProviders(<><App /><LocationProbe /></>, { route: '/rp/versions?compare=1&baseline=v0.2&view=full&scope=all&platform=mobile&change=CHG-004' });
    expect(await screen.findByRole('heading', { name: '手机订单按页面定位改动' })).toBeInTheDocument();
    const search = new URLSearchParams(screen.getByLabelText('清理后参数').textContent || '');
    for (const key of ['compare', 'baseline', 'view']) expect(search.has(key)).toBe(false);
    expect(search.get('scope')).toBe('all');
    expect(search.get('platform')).toBe('mobile');
    expect(search.get('change')).toBe('CHG-004');
    expect(screen.queryByRole('button', { name: '显示页面对比' })).not.toBeInTheDocument();
    expect(screen.queryByTitle('基线原型')).not.toBeInTheDocument();
});
