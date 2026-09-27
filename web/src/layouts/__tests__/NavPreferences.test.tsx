import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '@/App';
import { LOCK_STORAGE_KEY } from '@/hooks/useLockScreen';
import { defaultPreferences, type UserPreferences } from '@/hooks/usePreferences';
import { savePreferences } from '@/lib/preferences-storage';
import { fakeJwt, mockFetch, openPreferences, page, renderWithProviders, type MockHandler } from '@/test/helpers';
import type { CurrentUserView, MenuNode } from '@/types/api';
import { getToken, setToken } from '@/utils/token';

/**
 * 偏好 C 组（导航布局、页签风格与动画、路由动画、页面缓存、全局搜索、收藏、锁屏、面包屑子菜单、吸顶）
 * 在真实 AdminLayout 里生效。列设置见 components/__tests__/ColumnSettings.test.tsx。
 */

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

const base = { permission: null, sort: 0, visible: true, keepAlive: false, isExternal: false, status: 'enabled' as const, children: [] };

/** 首页 + 系统管理（含一个 keepAlive 的真实页面「参数配置」）+ 日志管理 */
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
            {
                ...base,
                id: 7,
                parentId: 2,
                title: '参数配置',
                type: 'menu',
                path: '/system/configs',
                component: 'system/configs/ConfigsPage',
                icon: 'Cog',
                keepAlive: true,
            },
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

function renderAuthed(route: string, prefs: Partial<UserPreferences> = {}, extra: Record<string, MockHandler> = {}) {
    // 本地偏好属于当前登录用户（id 1），服务端为 null 时按「自己的缓存」迁移而不是回落默认值
    setToken(fakeJwt(1));
    savePreferences({ ...defaultPreferences, ...prefs }, 1);
    const fetch = mockFetch({
        'GET /api/auth/me': me,
        'GET /api/auth/menus': menus,
        'GET /api/auth/preferences': null,
        'PUT /api/auth/preferences': null,
        'GET /api/configs': page([]),
        'GET /api/auth/favorite-menus': [],
        ...extra,
    });
    return { ...renderWithProviders(<App />, { route }), fetch };
}

const titleIs = (t: string) => waitFor(() => expect(document.title).toBe(`${t} - Weiran Admin`));
const layout = () => document.querySelector<HTMLElement>('.admin-layout');
const tabsBar = () => document.querySelector<HTMLElement>('.admin-tabs-bar');

beforeEach(() => {
    // document.title 跨用例保留，不清掉的话 titleIs 会被上一个用例的标题提前满足
    document.title = '';
});

afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe('navLayout', () => {
    it('vertical：侧边栏 + 顶栏面包屑，没有顶部导航', async () => {
        renderAuthed('/system/a');
        await titleIs('用户管理');
        expect(document.querySelector('.admin-sidebar')).not.toBeNull();
        expect(document.querySelector('.admin-header')).not.toBeNull();
        expect(document.querySelector('.admin-topbar')).toBeNull();
        expect(layout()).toHaveClass('admin-layout--nav-vertical');
    });

    it('horizontal：顶部水平导航，没有侧边栏与面包屑；点顶部菜单项跳转', async () => {
        renderAuthed('/system/a', { navLayout: 'horizontal' });
        await titleIs('用户管理');
        expect(document.querySelector('.admin-sidebar')).toBeNull();
        expect(document.querySelector('.admin-header')).toBeNull();
        const topnav = screen.getByRole('navigation', { name: '主导航' });
        // 目录作为下拉（sub），叶子作为顶级项；隐藏的测宽探测 Nav 是 aria-hidden，不计入
        expect(within(topnav).getByRole('menuitem', { name: /系统管理/ })).toBeInTheDocument();
        fireEvent.click(within(topnav).getByRole('menuitem', { name: /首页/ }));
        await titleIs('首页');
        // 顶栏承接操作区
        expect(within(document.querySelector('.admin-topbar') as HTMLElement).getByRole('button', { name: '全局搜索' })).toBeInTheDocument();
    });

    it('mixed：顶部只有一级菜单，侧边栏只显示当前一级下的子菜单；点另一个一级跳到它的第一个页面', async () => {
        renderAuthed('/system/a', { navLayout: 'mixed' });
        await titleIs('用户管理');
        const topnav = screen.getByRole('navigation', { name: '分类导航' });
        const sidebar = document.querySelector('.admin-sidebar') as HTMLElement;
        expect(within(sidebar).getByText('角色管理')).toBeInTheDocument();
        expect(within(sidebar).queryByText('登录日志')).toBeNull();

        fireEvent.click(within(topnav).getByRole('menuitem', { name: /日志管理/ }));
        await titleIs('登录日志');
        expect(within(document.querySelector('.admin-sidebar') as HTMLElement).getByText('登录日志')).toBeInTheDocument();

        // 一级是页面（首页）时没有侧边栏
        fireEvent.click(within(topnav).getByRole('menuitem', { name: /首页/ }));
        await titleIs('首页');
        expect(document.querySelector('.admin-sidebar')).toBeNull();
    });

    it('double：左侧图标轨 + 子菜单栏 + 面包屑；图标轨切换一级；图标走 renderNavIcon（有尺寸）', async () => {
        renderAuthed('/system/a', { navLayout: 'double' });
        await titleIs('用户管理');
        expect(document.querySelector('.admin-sidebar--double')).not.toBeNull();
        expect(document.querySelector('.admin-header')).not.toBeNull();
        const rail = screen.getByRole('navigation', { name: '分组导航' });
        const active = within(rail).getByRole('button', { name: /系统管理/ });
        expect(active).toHaveAttribute('aria-current', 'true');
        expect(active.querySelector('svg')?.getAttribute('width')).toBe('16');
        expect(within(document.querySelector('.double-sidebar__sub') as HTMLElement).getByText('角色管理')).toBeInTheDocument();

        fireEvent.click(within(rail).getByRole('button', { name: /日志管理/ }));
        await titleIs('登录日志');
        expect(document.querySelector('.double-sidebar__sub-title')?.textContent).toBe('日志管理');
        // 默认首列仅图标：名称只在 aria-label / Tooltip 里
        expect(document.querySelector('.admin-sidebar--double-icon')).not.toBeNull();
        expect(rail.querySelector('.double-sidebar__rail-label')).toBeNull();
    });

    it('double + doubleRailStyle=icon-text：首列显示图标 + 文字', async () => {
        renderAuthed('/system/a', { navLayout: 'double', doubleRailStyle: 'icon-text' });
        await titleIs('用户管理');
        expect(document.querySelector('.admin-sidebar--double-icon-text')).not.toBeNull();
        const rail = screen.getByRole('navigation', { name: '分组导航' });
        expect(within(rail).getByRole('button', { name: '系统管理' }).querySelector('.double-sidebar__rail-label')?.textContent).toBe('系统管理');
    });

    it('窄屏：任何布局都回落到移动端抽屉导航', async () => {
        vi.stubGlobal('matchMedia', (query: string) => ({
            matches: query.includes('max-width'),
            media: query,
            addEventListener: () => {},
            removeEventListener: () => {},
        }));
        renderAuthed('/dashboard', { navLayout: 'horizontal' });
        await screen.findByRole('button', { name: '打开导航菜单' });
        expect(document.querySelector('.admin-topbar')).toBeNull();
        expect(document.querySelector('.admin-sidebar')).toBeNull();
    });
});

describe('页签风格与动画、路由动画', () => {
    it('tabStyle 落到页签栏的 data-tab-style', async () => {
        renderAuthed('/system/a', { tabStyle: 'pill' });
        await titleIs('用户管理');
        expect(tabsBar()).toHaveAttribute('data-tab-style', 'pill');
    });

    it('tabAnimation=fade：关闭页签先挂退场 class，动画结束后才移除', async () => {
        renderAuthed('/system/a', { tabAnimation: 'fade' });
        await titleIs('用户管理');
        expect(tabsBar()).toHaveAttribute('data-tab-animation', 'fade');
        fireEvent.click(screen.getByRole('button', { name: '关闭 用户管理' }));
        expect(screen.getByRole('tab', { name: /用户管理/ })).toHaveClass('admin-tab-item--exiting');
        await waitFor(() => expect(screen.queryByRole('tab', { name: /用户管理/ })).toBeNull());
        await titleIs('首页');
    });

    it('退场动画期间切到被关的页签：定时器用最新的关闭逻辑，当前页始终有页签', async () => {
        renderAuthed('/system/a', { tabAnimation: 'fade' });
        await titleIs('用户管理');
        const sidebar = document.querySelector('.admin-sidebar') as HTMLElement;
        fireEvent.click(within(sidebar).getByText('角色管理'));
        await titleIs('角色管理');
        fireEvent.click(screen.getByRole('tab', { name: /用户管理/ }));
        await titleIs('用户管理');

        // 关掉非当前页「角色管理」，退场动画还没结束就切过去
        fireEvent.click(screen.getByRole('button', { name: '关闭 角色管理' }));
        fireEvent.click(screen.getByRole('tab', { name: /角色管理/ }));
        await titleIs('角色管理');
        await waitFor(() => expect(screen.queryByRole('tab', { name: /角色管理/ })).toBeNull());
        // 关闭的是当前页：跳到相邻页签，而不是停在一个没有页签的页面上
        await waitFor(() => expect(document.title).not.toBe('角色管理 - Weiran Admin'));
        expect(screen.getByRole('tab', { selected: true })).toBeInTheDocument();
    });

    it('tabAnimation=none：立即关闭，没有退场 class', async () => {
        renderAuthed('/system/a', { tabAnimation: 'none' });
        await titleIs('用户管理');
        fireEvent.click(screen.getByRole('button', { name: '关闭 用户管理' }));
        await waitFor(() => expect(screen.queryByRole('tab', { name: /用户管理/ })).toBeNull());
        expect(document.querySelector('.admin-tab-item--exiting')).toBeNull();
    });

    it('routeAnimation：非缓存页面的容器带 route-anim--* class；none 时不带', async () => {
        renderAuthed('/system/a', { routeAnimation: 'slide-up' });
        await screen.findByText('页面不存在');
        expect(screen.getByText('页面不存在').closest('.admin-page')).toHaveClass('route-anim--slide-up');
    });

    it('routeAnimation=none：没有动画 class', async () => {
        renderAuthed('/system/a', { routeAnimation: 'none' });
        await screen.findByText('页面不存在');
        expect(screen.getByText('页面不存在').closest('.admin-page')?.className).not.toMatch(/route-anim/);
    });
});

describe('enablePageCache', () => {
    const keyword = () => screen.getByPlaceholderText<HTMLInputElement>('配置键 / 描述');

    async function typeAndSwitchBack() {
        fireEvent.change(await screen.findByPlaceholderText('配置键 / 描述'), { target: { value: 'site' } });
        expect(keyword().value).toBe('site');
        fireEvent.click(screen.getByRole('tab', { name: /首页/ }));
        await titleIs('首页');
        fireEvent.click(screen.getByRole('tab', { name: /参数配置/ }));
        await titleIs('参数配置');
    }

    it('keepAlive 页面切换页签后保留输入；关闭页签后释放，再打开是新实例', async () => {
        renderAuthed('/system/configs', { enablePageCache: true, tabAnimation: 'none' });
        await typeAndSwitchBack();
        expect(keyword().value).toBe('site');
        // 缓存页不参与路由动画、以 Activity 保留
        expect(keyword().closest('.admin-page')).toHaveClass('admin-page--cached');

        fireEvent.click(screen.getByRole('button', { name: '关闭 参数配置' }));
        await titleIs('首页');
        fireEvent.click(within(document.querySelector('.admin-sidebar') as HTMLElement).getByText('参数配置'));
        await titleIs('参数配置');
        expect(keyword().value).toBe('');
    });

    it('滚动位置在离开前按页记下（不在旧页已隐藏后再读），切回时恢复', async () => {
        renderAuthed('/system/configs', { enablePageCache: true, tabAnimation: 'none' });
        await screen.findByPlaceholderText('配置键 / 描述');
        const content = document.querySelector('.admin-content') as HTMLElement;
        // 模拟浏览器：缓存页被隐藏（display:none）后内容变矮，scrollTop 被钳到 0
        let raw = 0;
        Object.defineProperty(content, 'scrollTop', {
            configurable: true,
            get: () => {
                const cached = keyword().closest('.admin-page');
                return cached && getComputedStyle(cached).display === 'none' ? 0 : raw;
            },
            set: (v: number) => {
                raw = v;
            },
        });
        content.scrollTop = 300;
        fireEvent.scroll(content);
        fireEvent.click(screen.getByRole('tab', { name: /首页/ }));
        await titleIs('首页');
        fireEvent.click(screen.getByRole('tab', { name: /参数配置/ }));
        await titleIs('参数配置');
        expect(raw).toBe(300);
    });

    it('enablePageCache=false：切回来是新实例', async () => {
        renderAuthed('/system/configs', { enablePageCache: false });
        await typeAndSwitchBack();
        expect(keyword().value).toBe('');
    });

    it('enableTabs=false 时不缓存', async () => {
        renderAuthed('/system/configs', { enablePageCache: true, enableTabs: false });
        fireEvent.change(await screen.findByPlaceholderText('配置键 / 描述'), { target: { value: 'site' } });
        fireEvent.click(within(document.querySelector('.admin-sidebar') as HTMLElement).getByText('用户管理'));
        await titleIs('用户管理');
        fireEvent.click(within(document.querySelector('.admin-sidebar') as HTMLElement).getByText('参数配置'));
        await titleIs('参数配置');
        expect(keyword().value).toBe('');
    });
});

describe('showMenuSearch（全局搜索）', () => {
    const openSearch = async () => {
        fireEvent.click(await screen.findByRole('button', { name: '全局搜索' }));
        return screen.findByRole('combobox', { name: '全局搜索' });
    };

    it('顶栏按钮打开命令面板：按标题过滤，↑↓ 选择，回车跳转并关闭', async () => {
        renderAuthed('/dashboard');
        const input = await openSearch();
        fireEvent.change(input, { target: { value: '管理' } });
        const list = screen.getByRole('listbox', { name: '搜索结果' });
        // 标题命中在前，只命中目录（系统管理）的排在后面
        expect(within(list).getAllByRole('option').map((o) => o.querySelector('.global-search__item-title')?.textContent)).toEqual([
            '用户管理',
            '角色管理',
            '参数配置',
            '登录日志',
        ]);

        fireEvent.keyDown(input, { key: 'ArrowDown' });
        expect(within(list).getAllByRole('option')[1]).toHaveAttribute('aria-selected', 'true');
        fireEvent.keyDown(input, { key: 'Enter' });
        await titleIs('角色管理');
        await waitFor(() => expect(screen.queryByRole('combobox', { name: '全局搜索' })).toBeNull());
    });

    it('Ctrl+K / ⌘+K 打开与关闭；无匹配时提示；点击结果跳转', async () => {
        renderAuthed('/dashboard');
        await titleIs('首页');
        fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
        const input = await screen.findByRole('combobox', { name: '全局搜索' });
        // Semi Modal 打开后会抢焦点，输入框要在它之后拿回焦点
        await waitFor(() => expect(input).toHaveFocus());
        fireEvent.change(input, { target: { value: '不存在' } });
        expect(screen.getByText('没有匹配的菜单')).toBeInTheDocument();
        fireEvent.keyDown(document.body, { key: 'k', metaKey: true });
        await waitFor(() => expect(screen.getByRole('button', { name: '全局搜索' })).toHaveAttribute('aria-expanded', 'false'));
        await waitFor(() => expect(screen.queryByRole('combobox', { name: '全局搜索' })).toBeNull());

        fireEvent.keyDown(document.body, { key: 'K', metaKey: true });
        fireEvent.change(await screen.findByRole('combobox', { name: '全局搜索' }), { target: { value: '登录' } });
        fireEvent.mouseDown(screen.getByRole('option', { name: /登录日志/ }));
        await titleIs('登录日志');
    });

    it('空关键字列出最近访问，可移除单条与清除', async () => {
        renderAuthed('/system/a');
        await titleIs('用户管理');
        fireEvent.click(within(document.querySelector('.admin-sidebar') as HTMLElement).getByText('角色管理'));
        await titleIs('角色管理');
        await openSearch();
        const list = screen.getByRole('listbox', { name: '搜索结果' });
        expect(within(list).getAllByRole('option').map((o) => o.querySelector('.global-search__item-title')?.textContent)).toEqual([
            '角色管理',
            '用户管理',
        ]);
        fireEvent.click(within(list).getByRole('button', { name: '移除用户管理' }));
        expect(within(list).getAllByRole('option')).toHaveLength(1);
        fireEvent.click(within(list).getByRole('button', { name: '清除' }));
        expect(screen.getByText('输入关键词搜索菜单')).toBeInTheDocument();
        expect(JSON.parse(localStorage.getItem('weiran_recent_menus') ?? 'null')).toEqual([]);
    });

    it('侧边栏不再有菜单搜索框；showMenuSearch=false 时没有入口，Ctrl+K 也不生效', async () => {
        renderAuthed('/dashboard', { showMenuSearch: false });
        await titleIs('首页');
        expect(screen.queryByRole('button', { name: '全局搜索' })).toBeNull();
        fireEvent.keyDown(document.body, { key: 'k', ctrlKey: true });
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.queryByRole('combobox', { name: '全局搜索' })).toBeNull();
    });
});

describe('showFavorites', () => {
    it('关闭时没有收藏星标与入口，也不请求收藏接口', async () => {
        const { fetch } = renderAuthed('/system/a', { showFavorites: false });
        await titleIs('用户管理');
        expect(screen.queryByRole('button', { name: '收藏此页' })).toBeNull();
        expect(screen.queryByRole('button', { name: '我的收藏' })).toBeNull();
        expect(fetch.calls.some((c) => c.path === '/api/auth/favorite-menus')).toBe(false);
    });

    it('面包屑星标收藏当前页（乐观更新 + PUT 全量），顶栏入口列出收藏并可跳转、移除', async () => {
        let saved = [4];
        const { fetch } = renderAuthed(
            '/system/a',
            { showFavorites: true },
            {
                'GET /api/auth/favorite-menus': () => saved,
                'PUT /api/auth/favorite-menus': (init: RequestInit) => {
                    saved = (JSON.parse(init.body as string) as { menuIds: number[] }).menuIds;
                    return null;
                },
            },
        );
        await waitFor(() => expect(fetch.calls.some((c) => c.path === '/api/auth/favorite-menus')).toBe(true));
        fireEvent.click(await screen.findByRole('button', { name: '收藏此页' }));
        expect(await screen.findByRole('button', { name: '取消收藏' })).toHaveAttribute('aria-pressed', 'true');
        await waitFor(() => expect(fetch.calls.find((c) => c.method === 'PUT' && c.path === '/api/auth/favorite-menus')?.body).toEqual({ menuIds: [4, 3] }));

        fireEvent.click(screen.getByRole('button', { name: '我的收藏' }));
        const panel = await screen.findByLabelText('我的收藏', { selector: '.admin-favorites' });
        expect(within(panel).getByText('角色管理')).toBeInTheDocument();
        fireEvent.click(within(panel).getByText('角色管理'));
        await titleIs('角色管理');

        fireEvent.click(screen.getByRole('button', { name: '移除收藏 角色管理' }));
        await waitFor(() => expect(fetch.calls.filter((c) => c.method === 'PUT' && c.path === '/api/auth/favorite-menus').at(-1)?.body).toEqual({ menuIds: [3] }));
    });

    it('收藏列表没加载成功（GET 失败）时不出星标与入口，不会用单个 id 全量覆盖服务端', async () => {
        const { fetch } = renderAuthed(
            '/system/a',
            { showFavorites: true },
            {
                'GET /api/auth/favorite-menus': () => Response.json({ code: 50000, message: '服务异常', data: null }, { status: 500 }),
                'PUT /api/auth/favorite-menus': null,
            },
        );
        await titleIs('用户管理');
        await waitFor(() => expect(fetch.calls.some((c) => c.path === '/api/auth/favorite-menus')).toBe(true));
        await new Promise((r) => setTimeout(r, 50));
        expect(screen.queryByRole('button', { name: '收藏此页' })).toBeNull();
        expect(screen.queryByRole('button', { name: '我的收藏' })).toBeNull();
        expect(fetch.calls.some((c) => c.method === 'PUT' && c.path === '/api/auth/favorite-menus')).toBe(false);
    });

    it('保存失败回滚：星标回到未收藏', async () => {
        renderAuthed(
            '/system/a',
            { showFavorites: true },
            { 'PUT /api/auth/favorite-menus': () => Response.json({ code: 40000, message: '菜单不可收藏', data: null }, { status: 400 }) },
        );
        fireEvent.click(await screen.findByRole('button', { name: '收藏此页' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '收藏此页' })).toHaveAttribute('aria-pressed', 'false'));
        expect(await screen.findByText('菜单不可收藏')).toBeInTheDocument();
    });

    it('没有面包屑的布局（horizontal）把星标放进操作区', async () => {
        renderAuthed('/system/a', { showFavorites: true, navLayout: 'horizontal' });
        await screen.findByRole('navigation', { name: '主导航' });
        const topbar = document.querySelector('.admin-topbar') as HTMLElement;
        expect(await within(topbar).findByRole('button', { name: '收藏此页' })).toBeInTheDocument();
    });
});

describe('enableLockScreen', () => {
    const verifyRoute = (ok: boolean) => ({
        'POST /api/auth/verify-password': () =>
            ok ? Response.json({ code: 0, message: 'ok', data: null }) : Response.json({ code: 40101, message: '密码错误', data: null }, { status: 401 }),
    });

    it('关闭时没有锁屏按钮，Alt+L 无效', async () => {
        renderAuthed('/dashboard');
        await titleIs('首页');
        expect(screen.queryByRole('button', { name: '锁屏' })).toBeNull();
        fireEvent.keyDown(document, { altKey: true, code: 'KeyL', key: '¬' });
        expect(screen.queryByRole('dialog', { name: '屏幕已锁定' })).toBeNull();
    });

    it('顶栏按钮锁定；密码错误提示「密码错误」且不清令牌；正确密码解锁', async () => {
        let ok = false;
        const { fetch } = renderAuthed('/dashboard', { enableLockScreen: true }, {
            'POST /api/auth/verify-password': () => verifyRoute(ok)['POST /api/auth/verify-password'](),
        });
        fireEvent.click(await screen.findByRole('button', { name: '锁屏' }));
        const lock = await screen.findByRole('dialog', { name: '屏幕已锁定' });
        expect(sessionStorage.getItem(LOCK_STORAGE_KEY)).toBe('1');
        expect([...document.body.children].find((c) => c.contains(layout()))).toHaveAttribute('inert');

        const input = within(lock).getByLabelText('登录密码');
        fireEvent.change(input, { target: { value: 'wrong' } });
        fireEvent.click(within(lock).getByRole('button', { name: '解锁' }));
        expect(await within(lock).findByRole('alert')).toHaveTextContent('密码错误');
        expect(getToken()).toBe(fakeJwt(1));
        expect(screen.getByRole('dialog', { name: '屏幕已锁定' })).toBeInTheDocument();
        expect(fetch.calls.find((c) => c.path === '/api/auth/verify-password')?.body).toEqual({ password: 'wrong' });

        ok = true;
        fireEvent.change(within(lock).getByLabelText('登录密码'), { target: { value: 'admin123' } });
        fireEvent.click(within(lock).getByRole('button', { name: '解锁' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: '屏幕已锁定' })).toBeNull());
        expect(sessionStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
        expect(getToken()).toBe(fakeJwt(1));
    });

    it('真实键盘序列：输错密码回车提示「密码错误」，清空后输对密码回车解锁', async () => {
        const user = userEvent.setup();
        let ok = false;
        renderAuthed('/dashboard', { enableLockScreen: true }, {
            'POST /api/auth/verify-password': () => verifyRoute(ok)['POST /api/auth/verify-password'](),
        });
        await user.click(await screen.findByRole('button', { name: '锁屏' }));
        const lock = await screen.findByRole('dialog', { name: '屏幕已锁定' });
        const input = within(lock).getByLabelText('登录密码');
        await user.type(input, 'wrong{Enter}');
        expect(await within(lock).findByRole('alert')).toHaveTextContent('密码错误');

        ok = true;
        await user.clear(input);
        await user.type(input, 'admin123{Enter}');
        await waitFor(() => expect(screen.queryByRole('dialog', { name: '屏幕已锁定' })).toBeNull());
    });

    it('回车在 keydown 就提交：不依赖已废弃的 keypress（CDP / 部分输入法下不一定派发）', async () => {
        const { fetch } = renderAuthed('/dashboard', { enableLockScreen: true }, verifyRoute(true));
        fireEvent.click(await screen.findByRole('button', { name: '锁屏' }));
        const lock = await screen.findByRole('dialog', { name: '屏幕已锁定' });
        const input = within(lock).getByLabelText('登录密码');
        fireEvent.change(input, { target: { value: 'admin123' } });
        fireEvent.keyDown(input, { key: 'Enter', code: 'Enter', keyCode: 13 });
        await waitFor(() => expect(screen.queryByRole('dialog', { name: '屏幕已锁定' })).toBeNull());
        expect(fetch.calls.filter((c) => c.path === '/api/auth/verify-password')).toHaveLength(1);
    });

    it('锁定时已打开的浮层（portal 到 body）也被 inert；解锁后恢复', async () => {
        renderAuthed('/dashboard', { enableLockScreen: true }, verifyRoute(true));
        await openPreferences();
        const drawer = await waitFor(() => {
            const el = document.querySelector('.prefs-drawer');
            if (!el) throw new Error('偏好抽屉未打开');
            return el;
        });
        const bodyChild = (el: Element) => [...document.body.children].find((c) => c.contains(el)) as HTMLElement;
        fireEvent.keyDown(document.body, { altKey: true, code: 'KeyL', key: '¬' });
        const lock = await screen.findByRole('dialog', { name: '屏幕已锁定' });
        expect(bodyChild(drawer)).toHaveAttribute('inert');
        expect(bodyChild(lock)).not.toHaveAttribute('inert');
        expect(document.activeElement && lock.contains(document.activeElement)).toBe(true);

        fireEvent.change(within(lock).getByLabelText('登录密码'), { target: { value: 'admin123' } });
        fireEvent.click(within(lock).getByRole('button', { name: '解锁' }));
        await waitFor(() => expect(screen.queryByRole('dialog', { name: '屏幕已锁定' })).toBeNull());
        expect(bodyChild(drawer)).not.toHaveAttribute('inert');
    });

    it('Alt+L 锁定；刷新（重新挂载）后仍是锁定状态', async () => {
        const first = renderAuthed('/dashboard', { enableLockScreen: true }, verifyRoute(true));
        await titleIs('首页');
        act(() => {
            fireEvent.keyDown(document, { altKey: true, code: 'KeyL', key: '¬' });
        });
        expect(await screen.findByRole('dialog', { name: '屏幕已锁定' })).toBeInTheDocument();
        first.unmount();

        renderAuthed('/dashboard', { enableLockScreen: true }, verifyRoute(true));
        expect(await screen.findByRole('dialog', { name: '屏幕已锁定' })).toBeInTheDocument();
    });

    it('锁屏里「重新登录」退出当前账号并解除锁定', async () => {
        sessionStorage.setItem(LOCK_STORAGE_KEY, '1');
        renderAuthed('/dashboard', { enableLockScreen: true }, { 'POST /api/auth/logout': null });
        const lock = await screen.findByRole('dialog', { name: '屏幕已锁定' });
        fireEvent.click(within(lock).getByRole('button', { name: '重新登录' }));
        await waitFor(() => expect(getToken()).toBeNull());
        expect(sessionStorage.getItem(LOCK_STORAGE_KEY)).toBeNull();
    });
});

describe('breadcrumbSubMenu 与 sidebarStickyScroll', () => {
    it('面包屑目录节点悬停弹出子菜单，点击跳转', async () => {
        renderAuthed('/system/a', { breadcrumbSubMenu: true });
        await titleIs('用户管理');
        const trigger = document.querySelector('.admin-header .breadcrumb-menu__trigger') as HTMLElement;
        expect(trigger).toHaveTextContent('系统管理');
        fireEvent.mouseEnter(trigger);
        const item = await screen.findByRole('menuitem', { name: /角色管理/ }, { timeout: 2000 });
        fireEvent.click(item);
        await titleIs('角色管理');
    });

    it('breadcrumbSubMenu=false：目录节点没有弹层', async () => {
        renderAuthed('/system/a');
        await titleIs('用户管理');
        expect(document.querySelector('.breadcrumb-menu__trigger')).toBeNull();
    });

    it('sidebarStickyScroll 控制侧边栏的吸顶 class', async () => {
        const { unmount } = renderAuthed('/dashboard');
        await titleIs('首页');
        expect(document.querySelector('.admin-sidebar')).toHaveClass('admin-sidebar--sticky-nav');
        unmount();
        document.title = '';
        renderAuthed('/dashboard', { sidebarStickyScroll: false });
        await titleIs('首页');
        expect(document.querySelector('.admin-sidebar')).not.toHaveClass('admin-sidebar--sticky-nav');
    });
});
