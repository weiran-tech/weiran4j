import { Avatar, Breadcrumb, Button, Dropdown, Nav, SideSheet, Spin } from '@douyinfe/semi-ui';
import type { NavItemPropsWithItems, OnSelectedData, SubNavProps } from '@douyinfe/semi-ui/lib/es/navigation';
import { ChevronDown, LogOut, Menu as MenuIcon, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { AppLogo } from '@/components/AppLogo';
import { HOME_PATH, config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/useMediaQuery';
import type { MenuNode } from '@/types/api';
import { renderNavIcon } from '@/utils/icons';
import { findMenuTrail, normalizePath, type MenuRoute } from '@/utils/menu';
import { TabsBar } from './TabsBar';
import { ThemeColorButton, ThemeModeButton } from './ThemeSwitcher';
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

/** 菜单树 → Semi Nav items：跳过按钮、禁用、隐藏节点；外链用特殊 key 在新窗口打开 */
export function toNavItems(menus: readonly MenuNode[]): NavItem[] {
    const items: NavItem[] = [];
    for (const m of menus) {
        if (m.type === 'button' || m.status !== 'enabled' || !m.visible) continue;
        const icon = renderNavIcon(m.icon);
        if (m.type === 'directory') {
            const children = toNavItems(m.children ?? []);
            if (children.length === 0) continue;
            items.push({ itemKey: `dir:${m.id}`, text: m.title, icon, items: children });
        } else if (m.path) {
            const itemKey = m.isExternal ? `${EXTERNAL_PREFIX}${m.path}` : normalizePath(m.path);
            items.push({ itemKey, text: m.title, icon });
        }
    }
    return items;
}

function readCollapsed(): boolean {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1';
    } catch {
        return false;
    }
}

interface AdminLayoutProps {
    menus: MenuNode[];
    routes: MenuRoute[];
}

/**
 * 后台外壳（vertical 布局）：左侧菜单 + 顶栏（面包屑、主题、用户）+ 多页签 + 内容区。
 * 小于 md（768px）时侧边栏收进抽屉，由移动端顶栏的菜单按钮打开。
 */
export function AdminLayout({ menus, routes }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const isMobile = useIsMobile();
    const [collapsed, setCollapsed] = useState(readCollapsed);
    const [mobileNavVisible, setMobileNavVisible] = useState(false);

    const pathname = normalizePath(location.pathname);
    const navItems = useMemo(() => toNavItems(menus), [menus]);
    const trail = useMemo(() => findMenuTrail(menus, pathname), [menus, pathname]);
    const defaultOpenKeys = useMemo(() => trail.filter((m) => m.type === 'directory').map((m) => `dir:${m.id}`), [trail]);

    const title = useMemo(() => {
        const route = routes.find((r) => r.path === pathname);
        return route?.title ?? STATIC_TITLES[pathname] ?? null;
    }, [routes, pathname]);

    const { tabs, close, closeOthers, closeAll } = useTabs(pathname, title);
    const go = (key: string | null) => {
        if (key) void navigate(key);
    };

    const toggleCollapsed = () => {
        setCollapsed((c) => {
            try {
                localStorage.setItem(COLLAPSED_KEY, c ? '0' : '1');
            } catch {
                // 忽略
            }
            return !c;
        });
    };

    const handleNavSelect = ({ itemKey }: OnSelectedData) => {
        const key = String(itemKey);
        if (key.startsWith(EXTERNAL_PREFIX)) {
            window.open(key.slice(EXTERNAL_PREFIX.length), '_blank', 'noopener');
        } else {
            setMobileNavVisible(false);
            void navigate(key);
        }
    };

    const goHome = () => {
        setMobileNavVisible(false);
        void navigate(HOME_PATH);
    };

    const breadcrumbs = trail.length ? trail.map((m) => m.title) : title ? [title] : [];
    const displayName = user?.nickname || user?.username;

    const headerActions = (
        <div className="admin-header__actions">
            <ThemeColorButton />
            <ThemeModeButton />
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

    return (
        <div className="admin-layout">
            {isMobile && (
                <>
                    <header className="admin-mobile-header">
                        <button type="button" className="admin-mobile-header__menu" aria-label="打开导航菜单" onClick={() => setMobileNavVisible(true)}>
                            <MenuIcon size={20} strokeWidth={1.8} />
                        </button>
                        <button type="button" className="admin-mobile-header__brand" onClick={goHome}>
                            <AppLogo size={26} />
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
                        <Nav
                            className="admin-mobile-nav"
                            mode="vertical"
                            items={navItems}
                            selectedKeys={[pathname]}
                            defaultOpenKeys={defaultOpenKeys}
                            onSelect={handleNavSelect}
                        />
                    </SideSheet>
                </>
            )}
            <div className="admin-body">
                {!isMobile && (
                    <aside className={`admin-sidebar${collapsed ? ' admin-sidebar--collapsed' : ''}`}>
                        <Nav
                            className="admin-sidebar__nav"
                            mode="vertical"
                            items={navItems}
                            selectedKeys={[pathname]}
                            defaultOpenKeys={defaultOpenKeys}
                            isCollapsed={collapsed}
                            bodyStyle={{ paddingTop: 8 }}
                            onSelect={handleNavSelect}
                            header={{
                                logo: (
                                    <button type="button" className="admin-sidebar__brand" onClick={goHome}>
                                        <AppLogo size={28} />
                                        <span className="admin-sidebar__title">{config.appTitle}</span>
                                    </button>
                                ),
                            }}
                            footer={{
                                children: (
                                    <Button
                                        theme="borderless"
                                        type="tertiary"
                                        icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                        aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
                                        onClick={toggleCollapsed}
                                    >
                                        {collapsed ? null : '收起侧边栏'}
                                    </Button>
                                ),
                            }}
                        />
                    </aside>
                )}
                <div className="admin-main">
                    {!isMobile && (
                        <header className="admin-header">
                            <div className="admin-header__breadcrumb">
                                <Breadcrumb>
                                    {breadcrumbs.map((b, i) => (
                                        <Breadcrumb.Item key={`${i}-${b}`}>{b}</Breadcrumb.Item>
                                    ))}
                                </Breadcrumb>
                            </div>
                            {headerActions}
                        </header>
                    )}
                    <TabsBar
                        tabs={tabs}
                        activeKey={pathname}
                        onSelect={(key) => void navigate(key)}
                        onClose={(key) => go(close(key))}
                        onCloseOthers={(key) => go(closeOthers(key))}
                        onCloseAll={() => go(closeAll())}
                    />
                    <main className="admin-content">
                        <Suspense
                            fallback={
                                <div className="page-loading">
                                    <Spin size="large" />
                                </div>
                            }
                        >
                            <Outlet />
                        </Suspense>
                    </main>
                </div>
            </div>
        </div>
    );
}
