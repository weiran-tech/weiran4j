import { Avatar, BackTop, Breadcrumb, Button, Dropdown, Nav, SideSheet, Spin } from '@douyinfe/semi-ui';
import type { NavItemPropsWithItems, OnSelectedData, SubNavProps } from '@douyinfe/semi-ui/lib/es/navigation';
import { ChevronDown, Expand, Lock, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, Settings, Shrink, UserRound } from 'lucide-react';
import { Suspense, useCallback, useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { LockScreen } from '@/components/LockScreen';
import { HOME_PATH, config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import { lockScreen, unlockScreen, useIsLocked } from '@/hooks/useLockScreen';
import { useIsMobile } from '@/hooks/useMediaQuery';
import { usePreferences } from '@/hooks/usePreferences';
import { getThemeColorVars } from '@/lib/theme-color';
import { useThemeController } from '@/providers/theme-context';
import type { MenuNode } from '@/types/api';
import { renderNavIcon } from '@/utils/icons';
import { findMenuTrail, flattenMenuPages, normalizePath, type FlatMenu, type MenuRoute } from '@/utils/menu';
import { BreadcrumbMenuPopover, visibleMenuChildren } from './BreadcrumbMenuPopover';
import { FavoritesButton, FavoriteToggle, useFavorites } from './FavoriteMenus';
import { KeepAliveOutlet } from './KeepAliveOutlet';
import { MenuSearch } from './MenuSearch';
import { PreferencesDrawer } from './PreferencesDrawer';
import { TabsBar } from './TabsBar';
import { ThemeColorButton, ThemeModeButton } from './ThemeSwitcher';
import { TopNav } from './TopNav';
import { useTabs } from './useTabs';
import './AdminLayout.css';

const COLLAPSED_KEY = 'weiran_sider_collapsed';
const EXTERNAL_PREFIX = 'external:';

/** 非菜单驱动的固定页面标题 */
const STATIC_TITLES: Record<string, string> = {
    [HOME_PATH]: '首页',
    '/profile': '个人中心',
    '/403': '无权限',
};

type NavItem = NavItemPropsWithItems | SubNavProps;

const dirKey = (m: MenuNode) => `dir:${m.id}`;

/** 菜单树 → Semi Nav items：跳过按钮、禁用、隐藏节点；外链用特殊 key 在新窗口打开 */
export function toNavItems(menus: readonly MenuNode[]): NavItem[] {
    const items: NavItem[] = [];
    for (const m of menus) {
        if (m.type === 'button' || m.status !== 'enabled' || !m.visible) continue;
        const icon = renderNavIcon(m.icon);
        if (m.type === 'directory') {
            const children = toNavItems(m.children ?? []);
            if (children.length === 0) continue;
            items.push({ itemKey: dirKey(m), text: m.title, icon, items: children });
        } else if (m.path) {
            const itemKey = m.isExternal ? `${EXTERNAL_PREFIX}${m.path}` : normalizePath(m.path);
            items.push({ itemKey, text: m.title, icon });
        }
    }
    return items;
}

/** 目录下第一个可跳转的内链页（mixed / double 点一级目录时落地用）；没有返回 null */
export function firstLeafKey(items: readonly NavItem[]): string | null {
    for (const item of items) {
        const children = 'items' in item && Array.isArray(item.items) ? (item.items as NavItem[]) : null;
        if (children?.length) {
            const leaf = firstLeafKey(children);
            if (leaf) return leaf;
        } else {
            const key = String(item.itemKey);
            if (key.startsWith('/')) return key;
        }
    }
    return null;
}

function childItems(item: NavItem | undefined): NavItem[] {
    return item && 'items' in item && Array.isArray(item.items) ? (item.items as NavItem[]) : [];
}

/** 每个目录 key → 它的祖先目录 key（由根到父），手风琴模式下保留祖先链用 */
export function collectDirAncestors(menus: readonly MenuNode[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const walk = (nodes: readonly MenuNode[], parents: string[]) => {
        for (const m of nodes) {
            if (m.type !== 'directory') continue;
            map.set(dirKey(m), parents);
            walk(m.children ?? [], [...parents, dirKey(m)]);
        }
    };
    walk(menus, []);
    return map;
}

/**
 * 侧边栏展开项的变化。
 * 普通模式照单全收；手风琴模式下新展开一个目录时只保留它的祖先链 + 它自己，收起兄弟目录。
 */
export function nextOpenKeys(prev: readonly string[], requested: readonly string[], accordion: boolean, ancestors: Map<string, string[]>): string[] {
    if (!accordion) return [...requested];
    const added = requested.filter((k) => !prev.includes(k));
    const target = added.at(-1);
    if (!target) return [...requested];
    const keep = new Set([...(ancestors.get(target) ?? []), target]);
    return requested.filter((k) => keep.has(k));
}

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

function subscribeFullscreen(cb: () => void) {
    document.addEventListener('fullscreenchange', cb);
    return () => document.removeEventListener('fullscreenchange', cb);
}

const isFullscreenNow = () => !!document.fullscreenElement;

function toggleFullscreen() {
    if (document.fullscreenElement) {
        void document.exitFullscreen?.().catch(() => {});
    } else {
        void document.documentElement.requestFullscreen?.().catch(() => {});
    }
}

interface Crumb {
    key: string;
    title: string;
    icon: string | null;
    /** 可跳转的路径；目录节点为 null */
    path: string | null;
    /** 目录节点的子菜单（偏好 breadcrumbSubMenu 的弹层内容） */
    children: MenuNode[];
}

interface AdminLayoutProps {
    menus: MenuNode[];
    routes: MenuRoute[];
}

/** 锁屏快捷键 Alt+L（按物理键位判断：macOS 上 Option+L 的 key 是「¬」） */
function isLockShortcut(e: KeyboardEvent) {
    return e.altKey && !e.ctrlKey && !e.metaKey && e.code === 'KeyL';
}

/**
 * 后台外壳：侧边菜单 / 顶部导航 + 顶栏（面包屑、主题、偏好设置、用户）+ 多页签 + 内容区。
 * 导航布局按偏好 navLayout（移植自 mono4ts）：
 * - vertical：左侧菜单（可折叠）+ 顶栏面包屑；
 * - horizontal：顶部水平导航（放不下的收进「更多」），无侧边栏、无面包屑；
 * - mixed：顶部一级菜单 + 左侧当前一级下的子菜单（一级是页面时不显示侧边栏），无面包屑；
 * - double：左侧图标轨（一级菜单）+ 子菜单栏 + 顶栏面包屑。
 * 小于 md（768px）时一律回落到移动端顶栏 + 左侧抽屉导航。
 * 外观与行为大多由偏好（hooks/usePreferences）控制，顶栏齿轮按钮打开偏好设置抽屉。
 */
export function AdminLayout({ menus, routes }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { preferences: prefs } = usePreferences();
    const { isDark, color } = useThemeController();
    const isMobile = useIsMobile();
    const isFullscreen = useSyncExternalStore(subscribeFullscreen, isFullscreenNow, () => false);
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [sidebarHovered, setSidebarHovered] = useState(false);
    const [mobileNavVisible, setMobileNavVisible] = useState(false);
    const [prefsVisible, setPrefsVisible] = useState(false);
    const [refreshSeq, setRefreshSeq] = useState<Record<string, number>>({});
    const locked = useIsLocked();

    // 悬停展开：收起状态下鼠标移入时临时按展开渲染
    const effectiveCollapsed = collapsed && !(prefs.sidebarHoverTrigger && sidebarHovered);

    const pathname = normalizePath(location.pathname);
    const navItems = useMemo(() => toNavItems(menus), [menus]);
    const dirAncestors = useMemo(() => collectDirAncestors(menus), [menus]);
    const trail = useMemo(() => findMenuTrail(menus, pathname), [menus, pathname]);
    const trailDirKeys = useMemo(() => trail.filter((m) => m.type === 'directory').map(dirKey), [trail]);

    // 展开项受控：路由变化时展开当前页所在目录；手风琴模式下只保留当前链路
    const [openKeys, setOpenKeys] = useState<string[]>(trailDirKeys);
    const [openKeysFor, setOpenKeysFor] = useState(trailDirKeys);
    if (openKeysFor !== trailDirKeys) {
        setOpenKeysFor(trailDirKeys);
        setOpenKeys((prev) => (prefs.sidebarAccordion ? trailDirKeys : [...new Set([...prev, ...trailDirKeys])]));
    }

    const pages = useMemo(() => flattenMenuPages(menus), [menus]);
    const keepAlivePaths = useMemo(() => new Set(pages.filter((p) => p.keepAlive && !p.isExternal).map((p) => p.path)), [pages]);
    const currentPage = useMemo(() => pages.find((p) => !p.isExternal && p.path === pathname) ?? null, [pages, pathname]);
    const { ready: favoritesReady, favorites, toggle: toggleFavorite, isFavorite } = useFavorites(pages, prefs.showFavorites);
    const showFavorites = prefs.showFavorites && favoritesReady;

    // 导航布局：窄屏一律走移动端抽屉
    const navLayout = isMobile ? 'vertical' : prefs.navLayout;
    // mixed / double 的当前一级菜单：默认跟随当前页所在一级，点击顶部 / 图标轨可临时切换
    const autoTopKey = useMemo(() => {
        const top = trail[0];
        if (top) return top.type === 'directory' ? dirKey(top) : normalizePath(top.path ?? '');
        return navItems[0] ? String(navItems[0].itemKey) : '';
    }, [trail, navItems]);
    const [topKey, setTopKey] = useState(autoTopKey);
    const [topKeyFor, setTopKeyFor] = useState(autoTopKey);
    if (topKeyFor !== autoTopKey) {
        setTopKeyFor(autoTopKey);
        setTopKey(autoTopKey);
    }
    const topItem = navItems.find((i) => String(i.itemKey) === topKey);
    const subItems = useMemo(() => childItems(topItem), [topItem]);
    const topNavItems = useMemo(
        () => (navLayout === 'mixed' ? navItems.map((i) => ({ itemKey: i.itemKey, text: i.text, icon: i.icon }) as NavItem) : navItems),
        [navLayout, navItems],
    );

    const route = useMemo(() => routes.find((r) => r.path === pathname), [routes, pathname]);
    const title = route?.title ?? STATIC_TITLES[pathname] ?? null;
    const routeIcons = useMemo(() => new Map(routes.map((r) => [r.path, r.icon])), [routes]);
    const homeIcon = routeIcons.get(HOME_PATH) ?? null;
    const pageIcon = routeIcons.get(pathname) ?? null;

    const { tabs, close, closeOthers, closeAll } = useTabs(pathname, title, pageIcon, {
        enabled: prefs.enableTabs,
        keep: prefs.keepTabs,
        maxCount: prefs.tabsMaxCount,
        evictPolicy: prefs.tabEvictPolicy,
        insertPolicy: prefs.openTabBehavior,
    });
    const openTabPaths = useMemo(() => new Set(tabs.map((t) => t.key)), [tabs]);
    // 图标以当前菜单为准（首页页签、从旧格式恢复的页签本身没有图标）
    const tabsWithIcons = useMemo(() => tabs.map((t) => ({ ...t, icon: routeIcons.get(t.key) ?? t.icon ?? null })), [tabs, routeIcons]);
    const go = (key: string | null) => {
        if (key) void navigate(key);
    };

    // 刷新页签：给该路径的内容换一个 key，让页面整个重新挂载
    const refreshTab = (key: string) => {
        if (key !== pathname) void navigate(key);
        setRefreshSeq((prev) => ({ ...prev, [key]: (prev[key] ?? 0) + 1 }));
    };

    // 动态标题
    useEffect(() => {
        document.title = prefs.dynamicTitle && title ? `${title} - ${config.appTitle}` : config.appTitle;
    }, [prefs.dynamicTitle, title]);

    // 选中菜单滚动到可视区
    useEffect(() => {
        if (!prefs.scrollMenuIntoView || effectiveCollapsed || isMobile) return;
        const el = document.querySelector('.admin-sidebar__nav .semi-navigation-item-selected');
        el?.scrollIntoView?.({ behavior: 'smooth', block: 'nearest' });
    }, [pathname, openKeys, effectiveCollapsed, isMobile, prefs.scrollMenuIntoView]);

    const toggleCollapsed = () => {
        setSidebarHovered(false);
        setCollapsed((c) => {
            try {
                localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
            } catch {
                // 忽略
            }
            return !c;
        });
    };

    const handleOpenChange = useCallback(
        ({ openKeys: requested }: { openKeys?: (string | number)[] }) => {
            setOpenKeys((prev) => nextOpenKeys(prev, (requested ?? []).map(String), prefs.sidebarAccordion, dirAncestors));
        },
        [prefs.sidebarAccordion, dirAncestors],
    );

    const handleNavSelect = ({ itemKey }: Pick<OnSelectedData, 'itemKey'>) => {
        const key = String(itemKey);
        if (key.startsWith(EXTERNAL_PREFIX)) {
            window.open(key.slice(EXTERNAL_PREFIX.length), '_blank', 'noopener');
        } else if (!key.startsWith('dir:')) {
            setMobileNavVisible(false);
            void navigate(key);
        }
    };

    // mixed 顶部 / double 图标轨：切换当前一级；一级是目录时落到它的第一个页面，是页面时直接打开
    const handleTopSelect = (key: string) => {
        setTopKey(key);
        const item = navItems.find((i) => String(i.itemKey) === key);
        const children = childItems(item);
        if (children.length) {
            const leaf = firstLeafKey(children);
            if (leaf) void navigate(leaf);
        } else {
            handleNavSelect({ itemKey: key });
        }
    };

    const openPage = (page: FlatMenu) => {
        setMobileNavVisible(false);
        if (page.isExternal) window.open(page.path, '_blank', 'noopener');
        else void navigate(page.path);
    };

    const openMenuNode = (menu: MenuNode) => {
        if (!menu.path) return;
        if (menu.isExternal) window.open(menu.path, '_blank', 'noopener');
        else void navigate(normalizePath(menu.path));
    };

    // 锁屏快捷键
    useEffect(() => {
        if (!prefs.enableLockScreen) return undefined;
        const onKeyDown = (e: KeyboardEvent) => {
            if (isLockShortcut(e)) {
                e.preventDefault();
                lockScreen();
            }
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [prefs.enableLockScreen]);

    const goHome = () => {
        setMobileNavVisible(false);
        void navigate(HOME_PATH);
    };

    const crumbs = useMemo<Crumb[]>(() => {
        const base: Crumb[] = trail.length
            ? trail.map((m) => ({
                  key: String(m.id),
                  title: m.title,
                  icon: m.icon,
                  path: m.type === 'menu' && m.path && !m.isExternal ? normalizePath(m.path) : null,
                  children: m.type === 'directory' ? visibleMenuChildren(m.children) : [],
              }))
            : title
              ? [{ key: pathname, title, icon: pageIcon, path: pathname, children: [] }]
              : [];
        if (prefs.breadcrumbShowHome && pathname !== HOME_PATH && base[0]?.path !== HOME_PATH) {
            return [{ key: HOME_PATH, title: '首页', icon: homeIcon, path: HOME_PATH, children: [] }, ...base];
        }
        return base;
    }, [trail, title, pathname, pageIcon, homeIcon, prefs.breadcrumbShowHome]);

    const displayName = user?.nickname || user?.username;
    const sectionDark = !isDark && (prefs.sidebarDarkMode || prefs.headerDarkMode);

    const layoutClassName = [
        'admin-layout',
        !isDark && prefs.sidebarDarkMode ? 'admin-layout--sidebar-dark' : '',
        !isDark && prefs.headerDarkMode ? 'admin-layout--header-dark' : '',
        prefs.grayscale ? 'admin-layout--grayscale' : '',
        prefs.colorBlind ? 'admin-layout--color-blind' : '',
        prefs.contentWidth === 'fixed' ? 'admin-layout--content-fixed' : '',
        `admin-layout--nav-${navLayout}`,
    ]
        .filter(Boolean)
        .join(' ');

    const layoutStyle = useMemo<CSSProperties>(() => {
        const style: Record<string, string> = { '--sidebar-width': `${prefs.sidebarWidth}px` };
        if (sectionDark) {
            // 局部深色区里的主色按深色档推导（提亮），与全局深色主题一致
            const vars = getThemeColorVars(color, true);
            Object.assign(style, {
                '--admin-section-dark-primary': vars.primary,
                '--admin-section-dark-primary-hover': vars.hover,
                '--admin-section-dark-primary-active': vars.active,
                '--admin-section-dark-primary-light-default': vars.lightDefault,
                '--admin-section-dark-primary-light-hover': vars.lightHover,
                '--admin-section-dark-primary-light-active': vars.lightActive,
                '--admin-section-dark-sidebar-active': vars.sidebarActive,
            });
        }
        return style;
    }, [prefs.sidebarWidth, sectionDark, color]);

    const favoriteToggle =
        showFavorites && currentPage ? (
            <FavoriteToggle page={currentPage} favorite={isFavorite(currentPage.id)} onToggle={toggleFavorite} />
        ) : null;

    const headerActions = (
        <div className="admin-header__actions">
            {/* 没有面包屑的布局（horizontal / mixed）把收藏星标放到操作区 */}
            {(navLayout === 'horizontal' || navLayout === 'mixed') && favoriteToggle}
            {showFavorites && <FavoritesButton favorites={favorites} onOpen={openPage} onRemove={toggleFavorite} />}
            {prefs.enableLockScreen && (
                <button type="button" className="admin-theme-btn" aria-label="锁屏" title="锁屏（Alt+L）" onClick={lockScreen}>
                    <Lock size={16} strokeWidth={1.8} />
                </button>
            )}
            {prefs.showFullscreen && !isMobile && (
                <button type="button" className="admin-theme-btn" aria-label={isFullscreen ? '退出全屏' : '全屏'} onClick={toggleFullscreen}>
                    {isFullscreen ? <Shrink size={16} strokeWidth={1.8} /> : <Expand size={16} strokeWidth={1.8} />}
                </button>
            )}
            <ThemeColorButton />
            <ThemeModeButton />
            <button type="button" className="admin-theme-btn" aria-label="偏好设置" onClick={() => setPrefsVisible(true)}>
                <Settings size={16} strokeWidth={1.8} />
            </button>
            <Dropdown
                position="bottomRight"
                render={
                    <Dropdown.Menu>
                        <Dropdown.Item icon={<UserRound size={14} />} onClick={() => void navigate('/profile')}>
                            个人中心
                        </Dropdown.Item>
                        <Dropdown.Divider />
                        <Dropdown.Item icon={<LogOut size={14} />} onClick={() => void logout()}>
                            退出登录
                        </Dropdown.Item>
                    </Dropdown.Menu>
                }
            >
                <span className="admin-header__user">
                    <Avatar size="extra-small" color="blue" {...(user?.avatar ? { src: user.avatar } : {})}>
                        {(displayName || '?').slice(0, 1)}
                    </Avatar>
                    <span className="admin-header__username">{displayName}</span>
                    <ChevronDown size={14} className="admin-header__caret" />
                </span>
            </Dropdown>
        </div>
    );

    const brand = (
        <button type="button" className="admin-sidebar__brand" onClick={goHome}>
            <AppLogo size={28} />
            <span className="admin-sidebar__title">{config.appTitle}</span>
        </button>
    );

    const menuSearch = prefs.showMenuSearch ? <MenuSearch pages={pages} onSelect={openPage} /> : null;
    const stickyClass = prefs.sidebarStickyScroll ? ' admin-sidebar--sticky-nav' : '';
    const selectedKeys = [pathname];

    const collapseFooter = {
        children: (
            <Button
                theme="borderless"
                type="tertiary"
                icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
                onClick={toggleCollapsed}
            >
                {effectiveCollapsed ? null : collapsed ? '展开侧边栏' : '收起侧边栏'}
            </Button>
        ),
    };

    // vertical：全部菜单；mixed：当前一级下的子菜单（一级是页面时不显示侧边栏）
    const sidebarItems = navLayout === 'mixed' ? subItems : navItems;
    const sidebar =
        navLayout === 'double' ? (
            <aside className={`admin-sidebar admin-sidebar--double${subItems.length ? '' : ' admin-sidebar--double-no-sub'}${stickyClass}`}>
                <div className="double-sidebar__rail">
                    {prefs.showLogo && (
                        <button type="button" className="double-sidebar__logo" aria-label="回到首页" onClick={goHome}>
                            <AppLogo size={26} />
                        </button>
                    )}
                    <nav className="double-sidebar__rail-list" aria-label="分组导航">
                        {navItems.map((item) => {
                            const key = String(item.itemKey);
                            const active = key === topKey;
                            return (
                                <button
                                    key={key}
                                    type="button"
                                    className={`double-sidebar__rail-item${active ? ' double-sidebar__rail-item--active' : ''}`}
                                    aria-current={active ? 'true' : undefined}
                                    onClick={() => handleTopSelect(key)}
                                >
                                    <span className="double-sidebar__rail-icon">{item.icon}</span>
                                    <span className="double-sidebar__rail-label">{item.text}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>
                {subItems.length > 0 && (
                    <div className="double-sidebar__sub">
                        <div className="double-sidebar__sub-title">{topItem?.text}</div>
                        {menuSearch}
                        <Nav
                            className="admin-sidebar__nav double-sidebar__sub-nav"
                            mode="vertical"
                            items={subItems}
                            selectedKeys={selectedKeys}
                            openKeys={openKeys}
                            onOpenChange={handleOpenChange}
                            bodyStyle={{ paddingTop: 8 }}
                            onSelect={handleNavSelect}
                        />
                    </div>
                )}
            </aside>
        ) : navLayout === 'vertical' || (navLayout === 'mixed' && sidebarItems.length > 0) ? (
            <aside
                className={`admin-sidebar${effectiveCollapsed ? ' admin-sidebar--collapsed' : ''}${stickyClass}`}
                onMouseEnter={() => {
                    if (prefs.sidebarHoverTrigger && collapsed) setSidebarHovered(true);
                }}
                onMouseLeave={() => setSidebarHovered(false)}
            >
                <Nav
                    className="admin-sidebar__nav"
                    mode="vertical"
                    items={sidebarItems}
                    selectedKeys={selectedKeys}
                    openKeys={effectiveCollapsed ? [] : openKeys}
                    onOpenChange={handleOpenChange}
                    isCollapsed={effectiveCollapsed}
                    bodyStyle={{ paddingTop: 8 }}
                    onSelect={handleNavSelect}
                    {...(prefs.showLogo && navLayout === 'vertical' ? { header: { logo: brand } } : {})}
                    footer={collapseFooter}
                >
                    {menuSearch && !effectiveCollapsed && <Nav.Header className="admin-sidebar__search">{menuSearch}</Nav.Header>}
                </Nav>
            </aside>
        ) : null;

    const breadcrumb = (
        <div className="admin-header__breadcrumb">
            {prefs.showBreadcrumb && (
                <Breadcrumb>
                    {crumbs.map((c, i) => {
                        const clickable = prefs.breadcrumbClickable && c.path !== null && i < crumbs.length - 1;
                        // Breadcrumb.Item 会 clone 图标注入 size，必须用 renderNavIcon
                        const icon = prefs.breadcrumbIcon ? renderNavIcon(c.icon, 14) : null;
                        const withSubMenu = prefs.breadcrumbSubMenu && c.children.length > 0 && i < crumbs.length - 1;
                        return (
                            <Breadcrumb.Item
                                key={c.key}
                                noLink={!clickable}
                                {...(icon ? { icon } : {})}
                                {...(clickable ? { onClick: () => void navigate(c.path ?? HOME_PATH) } : {})}
                            >
                                {withSubMenu ? (
                                    <BreadcrumbMenuPopover items={c.children} onNavigate={openMenuNode}>
                                        {c.title}
                                    </BreadcrumbMenuPopover>
                                ) : (
                                    c.title
                                )}
                            </Breadcrumb.Item>
                        );
                    })}
                </Breadcrumb>
            )}
            {favoriteToggle}
        </div>
    );

    return (
        <>
            {/* 锁定时由 LockScreen 把 body 下的布局与浮层整体 inert */}
            <div className={layoutClassName} style={layoutStyle}>
                {isMobile && (
                    <>
                        <header className="admin-mobile-header">
                            <button type="button" className="admin-mobile-header__menu" aria-label="打开导航菜单" onClick={() => setMobileNavVisible(true)}>
                                <MenuIcon size={20} strokeWidth={1.8} />
                            </button>
                            <button type="button" className="admin-mobile-header__brand" onClick={goHome}>
                                {prefs.showLogo && <AppLogo size={26} />}
                                <span className="admin-mobile-header__title">{title ?? config.appTitle}</span>
                            </button>
                            {headerActions}
                        </header>
                        <SideSheet
                            className="admin-mobile-nav-sheet"
                            title={
                                <button type="button" className="admin-mobile-nav-sheet__brand" onClick={goHome}>
                                    <AppLogo size={26} />
                                    <span>{config.appTitle}</span>
                                </button>
                            }
                            visible={mobileNavVisible}
                            onCancel={() => setMobileNavVisible(false)}
                            placement="left"
                            width="min(86vw, 320px)"
                            bodyStyle={{ padding: 0 }}
                        >
                            {menuSearch}
                            <Nav
                                className="admin-mobile-nav"
                                mode="vertical"
                                items={navItems}
                                selectedKeys={selectedKeys}
                                openKeys={openKeys}
                                onOpenChange={handleOpenChange}
                                onSelect={handleNavSelect}
                            />
                        </SideSheet>
                    </>
                )}
                {(navLayout === 'horizontal' || navLayout === 'mixed') && (
                    <header className="admin-topbar">
                        {prefs.showLogo && (
                            <button type="button" className="admin-topbar__brand" onClick={goHome}>
                                <AppLogo size={28} />
                                <span className="admin-sidebar__title">{config.appTitle}</span>
                            </button>
                        )}
                        <div className="admin-topbar__nav">
                            <TopNav
                                items={topNavItems}
                                selectedKeys={navLayout === 'mixed' ? [topKey] : [pathname, ...trailDirKeys]}
                                ariaLabel={navLayout === 'mixed' ? '分类导航' : '主导航'}
                                onSelect={({ itemKey }) => (navLayout === 'mixed' ? handleTopSelect(String(itemKey)) : handleNavSelect({ itemKey }))}
                            />
                        </div>
                        {navLayout === 'horizontal' && menuSearch && <div className="admin-topbar__search">{menuSearch}</div>}
                        {headerActions}
                    </header>
                )}
                <div className="admin-body">
                    {!isMobile && sidebar}
                    <div className="admin-main">
                        {!isMobile && (navLayout === 'vertical' || navLayout === 'double') && (
                            <header className="admin-header">
                                {breadcrumb}
                                {headerActions}
                            </header>
                        )}
                        {prefs.enableTabs && (
                            <TabsBar
                                tabs={tabsWithIcons}
                                activeKey={pathname}
                                showIcon={prefs.showTabIcon}
                                showSwitcher={prefs.showTabSwitcher}
                                doubleClickAction={prefs.tabDoubleClickAction}
                                tabStyle={prefs.tabStyle}
                                animation={prefs.tabAnimation}
                                onSelect={(key) => void navigate(key)}
                                onRefresh={refreshTab}
                                onClose={(key) => go(close(key))}
                                onCloseOthers={(key) => go(closeOthers(key))}
                                onCloseAll={() => go(closeAll())}
                            />
                        )}
                        <main className="admin-content">
                            <Suspense
                                fallback={
                                    <div className="page-loading">
                                        <Spin size="large" />
                                    </div>
                                }
                            >
                                <KeepAliveOutlet
                                    enabled={prefs.enableTabs && prefs.enablePageCache}
                                    keepAlivePaths={keepAlivePaths}
                                    openPaths={openTabPaths}
                                    pathname={pathname}
                                    refreshVersion={refreshSeq}
                                    {...(prefs.routeAnimation !== 'none' ? { animationClass: `route-anim--${prefs.routeAnimation}` } : {})}
                                />
                            </Suspense>
                            {/* 不用 ref：BackTop 挂载时父级 <main> 的 ref 还没绑定，DOM 却已插入 */}
                            {prefs.showBackTop && (
                                <BackTop
                                    className="admin-back-top"
                                    target={() => document.querySelector<HTMLElement>('.admin-content') ?? document.body}
                                    style={{ right: 24, bottom: 24 }}
                                />
                            )}
                        </main>
                    </div>
                </div>
                <PreferencesDrawer visible={prefsVisible} onClose={() => setPrefsVisible(false)} />
            </div>
            {locked && <LockScreen user={user} onUnlocked={unlockScreen} onReLogin={() => void logout()} />}
        </>
    );
}
