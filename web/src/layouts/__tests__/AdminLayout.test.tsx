import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { defaultPreferences, type UserPreferences } from '@/hooks/usePreferences';
import { PREFERENCES_STORAGE_KEY, savePreferences } from '@/lib/preferences-storage';
import { mockFetch, openPreferences, renderWithProviders } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { signIn } from '@/test/session';
import { collectDirAncestors, nextOpenKeys } from '../AdminLayout';

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
    hasPassword: true,
};

const base = { permission: null, sort: 0, visible: true, keepAlive: false, isExternal: false, status: 'enabled' as const, children: [] };

/** 首页 + 两个目录；目录下的页面组件不存在，渲染「页面不存在」占位（不发额外请求） */
const menus: MenuNode[] = [
    { ...base, id: 1, parentId: 0, title: '首页', type: 'menu', path: '/dashboard', component: 'dashboard/DashboardPage', icon: 'LayoutDashboard' },
    {
        ...base,
        id: 2,
        parentId: 0,
        title: '系统管理',
        type: 'directory',
        path: null,
        component: null,
        icon: 'Settings',
        children: [
            { ...base, id: 3, parentId: 2, title: '用户管理', type: 'menu', path: '/system/a', component: 'nope/A', icon: 'Shield' },
            { ...base, id: 4, parentId: 2, title: '角色管理', type: 'menu', path: '/system/b', component: 'nope/B', icon: 'KeyRound' },
        ],
    },
    {
        ...base,
        id: 5,
        parentId: 0,
        title: '日志管理',
        type: 'directory',
        path: null,
        component: null,
        icon: 'ScrollText',
        children: [{ ...base, id: 6, parentId: 5, title: '登录日志', type: 'menu', path: '/logs/a', component: 'nope/C', icon: 'LogIn' }],
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

function renderAuthed(route = '/dashboard', prefs: Partial<UserPreferences> = {}) {
    // 本地偏好属于当前登录用户（id 1），服务端为 null 时按「自己的缓存」迁移而不是回落默认值
    signIn(1);
    savePreferences({ ...defaultPreferences, ...prefs }, 1);
    const fetch = mockFetch({
        'GET /api/auth/me': me,
        'GET /api/auth/menus': menus,
        'GET /api/auth/preferences': null,
        'PUT /api/auth/preferences': null,
        'GET /api/dicts/code/sys_user_gender/items': [],
    });
    return { ...renderWithProviders(<App />, { route }), fetch };
}

const layout = () => document.querySelector<HTMLElement>('.admin-layout');
const crumbTexts = () => [...document.querySelectorAll('.admin-header .semi-breadcrumb-item')].map((e) => e.textContent);
const storedPrefs = () => JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? 'null') as UserPreferences | null;

describe('AdminLayout', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.removeAttribute('theme-mode');
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('桌面端：侧边栏品牌 + 顶栏主题按钮点击循环明暗模式，写入偏好', async () => {
        renderAuthed();
        const modeBtn = await screen.findByRole('button', { name: '切换主题（当前：浅色）' });
        expect(document.querySelector('.admin-sidebar')).not.toBeNull();
        expect(screen.queryByRole('button', { name: '打开导航菜单' })).toBeNull();

        fireEvent.click(modeBtn);
        expect(await screen.findByRole('button', { name: '切换主题（当前：深色）' })).toBeInTheDocument();
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(storedPrefs()).toMatchObject({ colorMode: 'dark' });
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

    it('默认偏好：页签栏、从首页开始的面包屑、动态标题、Logo、全屏按钮、侧边栏宽度 240', async () => {
        renderAuthed('/system/a');
        await screen.findByText('页面不存在');
        expect(document.querySelector('.admin-tabs-bar')).not.toBeNull();
        expect(screen.getByRole('button', { name: '全部页签' })).toBeInTheDocument();
        expect(crumbTexts()).toEqual(['首页', '系统管理', '用户管理']);
        expect(document.title).toBe('用户管理 - Weiran Admin');
        expect(document.querySelector('.admin-sidebar__brand')).not.toBeNull();
        expect(screen.getByRole('button', { name: '全屏' })).toBeInTheDocument();
        expect(layout()?.style.getPropertyValue('--sidebar-width')).toBe('240px');
        expect(document.querySelectorAll('.admin-header .semi-breadcrumb-item svg')).toHaveLength(3);
        // Semi Breadcrumb.Item 会 clone 图标注入 size="default"：lucide 直接交给它会渲染成 width="default" 撑满顶栏
        for (const svg of document.querySelectorAll('.admin-header .semi-breadcrumb-item svg')) {
            expect(svg.getAttribute('width')).toBe('14');
        }
        expect(document.querySelectorAll('.admin-tab-item__icon')).toHaveLength(2);
    });

    it('关掉的开关：页签、面包屑、Logo、动态标题、全屏按钮、页签切换器', async () => {
        renderAuthed('/system/a', {
            showBreadcrumb: false,
            showLogo: false,
            dynamicTitle: false,
            showFullscreen: false,
            showTabSwitcher: false,
            showTabIcon: false,
        });
        await screen.findByText('页面不存在');
        expect(document.querySelector('.admin-header .semi-breadcrumb-wrapper')).toBeNull();
        expect(document.querySelector('.admin-sidebar__brand')).toBeNull();
        expect(document.title).toBe('Weiran Admin');
        expect(screen.queryByRole('button', { name: '全屏' })).toBeNull();
        expect(screen.queryByRole('button', { name: '全部页签' })).toBeNull();
        expect(document.querySelector('.admin-tab-item__icon')).toBeNull();
    });

    it('enableTabs=false：不渲染页签栏', async () => {
        renderAuthed('/system/a', { enableTabs: false });
        await screen.findByText('页面不存在');
        expect(document.querySelector('.admin-tabs-bar')).toBeNull();
    });

    it('面包屑：不从首页开始、不显示图标、不可点击', async () => {
        renderAuthed('/system/a', { breadcrumbShowHome: false, breadcrumbIcon: false, breadcrumbClickable: false });
        await screen.findByText('页面不存在');
        expect(crumbTexts()).toEqual(['系统管理', '用户管理']);
        expect(document.querySelector('.admin-header .semi-breadcrumb-item svg')).toBeNull();
        expect(document.querySelector('.admin-header .semi-breadcrumb-item-link')).toBeNull();
    });

    it('面包屑可点击：点「首页」跳转；目录与末级不可点', async () => {
        renderAuthed('/system/a');
        await screen.findByText('页面不存在');
        const links = document.querySelectorAll<HTMLElement>('.admin-header .semi-breadcrumb-item-link');
        expect([...links].map((e) => e.textContent)).toEqual(['首页']);
        fireEvent.click(links[0] as HTMLElement);
        await waitFor(() => expect(document.title).toBe('首页 - Weiran Admin'));
    });

    it('外观类偏好落到布局根节点：灰色、固定宽度、局部深色、侧边栏宽度', async () => {
        renderAuthed('/dashboard', { grayscale: true, contentWidth: 'fixed', sidebarDarkMode: true, headerDarkMode: true, sidebarWidth: 280 });
        await screen.findByRole('button', { name: '全局搜索' });
        const root = layout();
        expect(root).toHaveClass('admin-layout--grayscale', 'admin-layout--content-fixed', 'admin-layout--sidebar-dark', 'admin-layout--header-dark');
        expect(root?.style.getPropertyValue('--sidebar-width')).toBe('280px');
        // 局部深色区的主色按深色档推导（#0064FA 提亮）
        expect(root?.style.getPropertyValue('--admin-section-dark-primary')).not.toBe('');
        expect(root?.style.getPropertyValue('--admin-section-dark-primary')).not.toBe('#0064FA');
    });

    it('局部深色只在浅色主题下生效；色弱模式', async () => {
        renderAuthed('/dashboard', { colorMode: 'dark', sidebarDarkMode: true, headerDarkMode: true, colorBlind: true });
        await screen.findByRole('button', { name: '全局搜索' });
        expect(layout()).not.toHaveClass('admin-layout--sidebar-dark');
        expect(layout()).not.toHaveClass('admin-layout--header-dark');
        expect(layout()).toHaveClass('admin-layout--color-blind');
    });

    it('双击页签 = 刷新：当前页面重新挂载', async () => {
        renderAuthed('/system/a', { tabDoubleClickAction: 'refresh' });
        const before = (await screen.findByText('页面不存在')).closest('.page-container');
        const tab = screen.getByRole('tab', { name: /用户管理/ });
        fireEvent.doubleClick(tab);
        await waitFor(() => expect(before?.isConnected).toBe(false));
        expect(await screen.findByText('页面不存在')).toBeInTheDocument();
    });

    it('双击页签 = 关闭；= 无', async () => {
        renderAuthed('/system/a', { tabDoubleClickAction: 'close' });
        await screen.findByText('页面不存在');
        fireEvent.doubleClick(screen.getByRole('tab', { name: /用户管理/ }));
        // 默认 tabAnimation=fade：先播退场动画再真正关闭
        await waitFor(() => expect(screen.queryByRole('tab', { name: /用户管理/ })).toBeNull());
        await waitFor(() => expect(document.title).toBe('首页 - Weiran Admin'));
    });

    it('菜单选中项自动滚动到可视区（可关）', async () => {
        const spy = vi.fn();
        Element.prototype.scrollIntoView = spy;
        renderAuthed('/logs/a');
        await screen.findByText('页面不存在');
        await waitFor(() => expect(spy).toHaveBeenCalled());
    });

    it('scrollMenuIntoView=false 时不滚动', async () => {
        const spy = vi.fn();
        Element.prototype.scrollIntoView = spy;
        renderAuthed('/logs/a', { scrollMenuIntoView: false });
        await screen.findByText('页面不存在');
        expect(spy).not.toHaveBeenCalled();
    });

    it('悬停展开：侧边栏收起时移入临时展开，移出收回；未开启时不展开', async () => {
        localStorage.setItem('weiran_sider_collapsed', '1');
        renderAuthed('/dashboard', { sidebarHoverTrigger: true });
        await screen.findByRole('button', { name: '全局搜索' });
        const aside = document.querySelector('.admin-sidebar') as HTMLElement;
        expect(aside).toHaveClass('admin-sidebar--collapsed');
        fireEvent.mouseEnter(aside);
        expect(aside).not.toHaveClass('admin-sidebar--collapsed');
        fireEvent.mouseLeave(aside);
        expect(aside).toHaveClass('admin-sidebar--collapsed');
    });

    it('悬停展开关闭时移入不展开', async () => {
        localStorage.setItem('weiran_sider_collapsed', '1');
        renderAuthed('/dashboard');
        await screen.findByRole('button', { name: '全局搜索' });
        const aside = document.querySelector('.admin-sidebar') as HTMLElement;
        fireEvent.mouseEnter(aside);
        expect(aside).toHaveClass('admin-sidebar--collapsed');
    });

    it('回到顶部：内容区滚动超过 400px 后出现（可关）', async () => {
        renderAuthed('/dashboard');
        await screen.findByRole('button', { name: '全局搜索' });
        const content = document.querySelector('.admin-content') as HTMLElement;
        content.scrollTop = 600;
        fireEvent.scroll(content);
        await waitFor(() => expect(document.querySelector('.admin-back-top')).not.toBeNull());
    });

    it('showBackTop=false 时滚动也不出现', async () => {
        renderAuthed('/dashboard', { showBackTop: false });
        await screen.findByRole('button', { name: '全局搜索' });
        const content = document.querySelector('.admin-content') as HTMLElement;
        content.scrollTop = 600;
        fireEvent.scroll(content);
        await new Promise((r) => setTimeout(r, 50));
        expect(document.querySelector('.admin-back-top')).toBeNull();
    });

    it('偏好设置抽屉：改开关即时生效并写入偏好；恢复默认', async () => {
        renderAuthed('/system/a');
        await openPreferences();
        const drawer = await screen.findByRole('dialog');
        for (const title of ['外观', '布局与导航', '页签', '面包屑', '表格', '其它']) {
            expect(within(drawer).getByLabelText(title)).toBeInTheDocument();
        }
        // C 组字段已接通行为，出现在对应分组；filesViewMode 没有消费方，不出现
        const layoutPicker = within(within(drawer).getByLabelText('布局与导航')).getByRole('radiogroup', { name: /导航布局/ });
        expect(within(layoutPicker).getAllByRole('radio').map((r) => r.textContent)).toEqual(['左侧菜单', '顶部菜单', '混合菜单', '双列菜单']);
        expect(within(layoutPicker).getByRole('radio', { name: '左侧菜单' })).toHaveAttribute('aria-checked', 'true');
        // 双列首列形式只在双列布局下出现
        expect(within(drawer).queryByText('双列首列形式')).toBeNull();
        fireEvent.click(within(layoutPicker).getByRole('radio', { name: '双列菜单' }));
        await waitFor(() => expect(document.querySelector('.admin-sidebar--double-icon')).not.toBeNull());
        expect(storedPrefs()?.navLayout).toBe('double');
        fireEvent.click(within(drawer).getByText('图标 + 文字'));
        await waitFor(() => expect(document.querySelector('.admin-sidebar--double-icon-text')).not.toBeNull());
        expect(storedPrefs()?.doubleRailStyle).toBe('icon-text');
        fireEvent.click(within(layoutPicker).getByRole('radio', { name: '左侧菜单' }));
        await waitFor(() => expect(document.querySelector('.admin-sidebar--double')).toBeNull());
        expect(within(drawer).getByRole('switch', { name: '锁屏' })).toBeInTheDocument();
        expect(within(drawer).getByRole('switch', { name: '收藏菜单' })).toBeInTheDocument();
        expect(within(drawer).queryByText(/文件/)).toBeNull();

        fireEvent.click(within(drawer).getByRole('switch', { name: '显示面包屑' }));
        await waitFor(() => expect(document.querySelector('.admin-header .semi-breadcrumb-wrapper')).toBeNull());
        expect(storedPrefs()?.showBreadcrumb).toBe(false);

        fireEvent.click(within(drawer).getByRole('switch', { name: '灰色模式' }));
        expect(layout()).toHaveClass('admin-layout--grayscale');
        fireEvent.click(within(drawer).getByRole('switch', { name: '色弱模式' }));
        expect(layout()).toHaveClass('admin-layout--color-blind');
        expect(layout()).not.toHaveClass('admin-layout--grayscale');

        // 抽屉底部按钮 → 二次确认弹窗里的同名按钮
        fireEvent.click(screen.getByRole('button', { name: '恢复默认' }));
        const confirm = await waitFor(() => {
            const el = document.querySelector<HTMLElement>('.semi-modal-confirm');
            if (!el) throw new Error('确认框未出现');
            return el;
        });
        act(() => within(confirm).getByRole('button', { name: 'confirm' }).click());
        await waitFor(() => expect(document.querySelector('.admin-header .semi-breadcrumb-wrapper')).not.toBeNull());
        expect(layout()).not.toHaveClass('admin-layout--color-blind');
        expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
    });
});

describe('侧边栏手风琴', () => {
    const ancestors = collectDirAncestors([
        ...menus,
        {
            ...base,
            id: 7,
            parentId: 0,
            title: '外层',
            type: 'directory',
            path: null,
            component: null,
            icon: null,
            children: [{ ...base, id: 8, parentId: 7, title: '内层', type: 'directory', path: null, component: null, icon: null }],
        },
    ]);

    it('collectDirAncestors：目录 → 祖先目录链', () => {
        expect(ancestors.get('dir:2')).toEqual([]);
        expect(ancestors.get('dir:8')).toEqual(['dir:7']);
    });

    it('手风琴：展开一个目录时收起兄弟，保留祖先链', () => {
        expect(nextOpenKeys(['dir:2'], ['dir:2', 'dir:5'], true, ancestors)).toEqual(['dir:5']);
        expect(nextOpenKeys(['dir:7'], ['dir:7', 'dir:8'], true, ancestors)).toEqual(['dir:7', 'dir:8']);
        expect(nextOpenKeys(['dir:2', 'dir:5'], ['dir:5'], true, ancestors)).toEqual(['dir:5']);
    });

    it('非手风琴：照单全收', () => {
        expect(nextOpenKeys(['dir:2'], ['dir:2', 'dir:5'], false, ancestors)).toEqual(['dir:2', 'dir:5']);
    });
});
