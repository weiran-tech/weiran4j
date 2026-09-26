import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { THEME_STORAGE_KEY } from '@/lib/theme';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { setToken } from '@/utils/token';

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

const menus: MenuNode[] = [
    {
        id: 1,
        parentId: 0,
        title: '首页',
        type: 'menu',
        path: '/dashboard',
        component: 'dashboard/DashboardPage',
        icon: 'LayoutDashboard',
        permission: null,
        sort: 0,
        visible: true,
        keepAlive: false,
        isExternal: false,
        status: 'enabled',
        children: [],
    },
];

/** 让 max-width 类查询命中，模拟 < md 的窄屏 */
function stubMobileViewport() {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query.includes('max-width'),
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    }));
}

function renderAuthed() {
    setToken('t');
    mockFetch({ 'GET /api/auth/me': me, 'GET /api/auth/menus': menus, 'GET /api/dicts/code/sys_user_gender/items': [] });
    return renderWithProviders(<App />, { route: '/dashboard' });
}

describe('AdminLayout', () => {
    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.removeAttribute('theme-mode');
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('桌面端：侧边栏品牌 + 顶栏主题按钮点击循环明暗模式', async () => {
        renderAuthed();
        const modeBtn = await screen.findByRole('button', { name: '切换主题（当前：浅色）' });
        expect(document.querySelector('.admin-sidebar')).not.toBeNull();
        expect(screen.queryByRole('button', { name: '打开导航菜单' })).toBeNull();

        fireEvent.click(modeBtn);
        expect(await screen.findByRole('button', { name: '切换主题（当前：深色）' })).toBeInTheDocument();
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '')).toMatchObject({ mode: 'dark' });
    });

    it('窄屏：不渲染侧边栏，改为顶栏菜单按钮打开抽屉导航', async () => {
        stubMobileViewport();
        renderAuthed();
        const menuBtn = await screen.findByRole('button', { name: '打开导航菜单' });
        expect(document.querySelector('.admin-sidebar')).toBeNull();

        fireEvent.click(menuBtn);
        expect(await screen.findByText('Weiran Admin')).toBeInTheDocument();
        expect(document.querySelector('.admin-mobile-nav')).not.toBeNull();
    });
});
