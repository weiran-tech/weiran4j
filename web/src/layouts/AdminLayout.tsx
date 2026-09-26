import { Avatar, Breadcrumb, Button, Dropdown, Layout, Nav, Spin } from '@douyinfe/semi-ui';
import type { NavItemPropsWithItems, SubNavProps } from '@douyinfe/semi-ui/lib/es/navigation';
import { ChevronDown, LogOut, PanelLeftClose, PanelLeftOpen, UserRound } from 'lucide-react';
import { Suspense, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HOME_PATH, config } from '@/config';
import { useAuth } from '@/hooks/useAuth';
import type { MenuNode } from '@/types/api';
import { renderNavIcon } from '@/utils/icons';
import { findMenuTrail, normalizePath, type MenuRoute } from '@/utils/menu';
import { TabsBar } from './TabsBar';
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

export function AdminLayout({ menus, routes }: AdminLayoutProps) {
    const location = useLocation();
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const [collapsed, setCollapsed] = useState(readCollapsed);

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

    const breadcrumbs = trail.length ? trail.map((m) => m.title) : title ? [title] : [];

    return (
        <Layout className="admin-layout">
            <Layout.Sider className="admin-layout__sider">
                <Nav
                    className="admin-layout__nav"
                    items={navItems}
                    selectedKeys={[pathname]}
                    defaultOpenKeys={defaultOpenKeys}
                    isCollapsed={collapsed}
                    onSelect={({ itemKey }) => {
                        const key = String(itemKey);
                        if (key.startsWith(EXTERNAL_PREFIX)) {
                            window.open(key.slice(EXTERNAL_PREFIX.length), '_blank', 'noopener');
                        } else {
                            void navigate(key);
                        }
                    }}
                    header={{
                        text: config.appTitle,
                        logo: <span className="admin-layout__logo">W</span>,
                    }}
                    footer={{
                        children: (
                            <Button
                                theme="borderless"
                                type="tertiary"
                                icon={collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
                                aria-label={collapsed ? '展开侧边栏' : '收起侧边栏'}
                                onClick={toggleCollapsed}
                            />
                        ),
                    }}
                />
            </Layout.Sider>
            <Layout className="admin-layout__main">
                <Layout.Header className="admin-layout__header">
                    <Breadcrumb>
                        {breadcrumbs.map((b, i) => (
                            <Breadcrumb.Item key={`${i}-${b}`}>{b}</Breadcrumb.Item>
                        ))}
                    </Breadcrumb>
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
                        <span className="admin-layout__user">
                            <Avatar size="small" color="blue" {...(user?.avatar ? { src: user.avatar } : {})}>
                                {(user?.nickname || user?.username || '?').slice(0, 1)}
                            </Avatar>
                            <span>{user?.nickname || user?.username}</span>
                            <ChevronDown size={14} />
                        </span>
                    </Dropdown>
                </Layout.Header>
                <TabsBar
                    tabs={tabs}
                    activeKey={pathname}
                    onSelect={(key) => void navigate(key)}
                    onClose={(key) => go(close(key))}
                    onCloseOthers={(key) => go(closeOthers(key))}
                    onCloseAll={() => go(closeAll())}
                />
                <Layout.Content className="admin-layout__content">
                    <Suspense
                        fallback={
                            <div className="page-loading">
                                <Spin size="large" />
                            </div>
                        }
                    >
                        <Outlet />
                    </Suspense>
                </Layout.Content>
            </Layout>
        </Layout>
    );
}
