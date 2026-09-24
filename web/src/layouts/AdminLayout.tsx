import { Layout, Nav, Avatar, Dropdown } from '@douyinfe/semi-ui';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchCurrentAccount, hasPermission, logout } from '../lib/auth';

/**
 * 菜单项不带图标：`@douyinfe/semi-icons` 未随 `@douyinfe/semi-ui` 安装
 * （两者是独立包，`semi-ui` 本身只导出通用 `Icon` 组件，不含具体图标），
 * 本次不为了图标新增依赖，保持纯文字菜单。
 */
interface NavItem {
    itemKey: string;
    text: string;
}

const { Header, Sider, Content } = Layout;

/**
 * 后台管理布局壳子：侧边菜单 + 顶部栏 + 内容区。
 *
 * 菜单项按权限点过滤显隐（`admin-console-shell` spec FR-002），真正的访问控制在后端，
 * 这里只是体验优化。新增业务模块页面只需要在 `App.tsx` 追加子路由 + 这里追加一个菜单项，
 * 不需要改动本组件的结构（FR-004）。
 */
export function AdminLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { data: account } = useQuery({ queryKey: ['auth', 'me'], queryFn: fetchCurrentAccount });

    function onLogout() {
        logout();
        queryClient.clear();
        void navigate('/login', { replace: true });
    }

    const candidateItems: (NavItem | false)[] = [
        hasPermission(account ?? null, 'weiran-system:role.index') && { itemKey: '/roles', text: '角色管理' },
        hasPermission(account ?? null, 'weiran-system:account.index') && { itemKey: '/accounts', text: '账号管理' },
        hasPermission(account ?? null, 'weiran-system:ban.index') && { itemKey: '/bans', text: '风险拦截' },
    ];
    const items = candidateItems.filter((item): item is NavItem => Boolean(item));

    return (
        <Layout style={{ height: '100vh' }}>
            <Sider>
                <Nav
                    selectedKeys={[location.pathname]}
                    items={items}
                    onSelect={(data) => {
                        if (typeof data.itemKey === 'string') {
                            void navigate(data.itemKey);
                        }
                    }}
                    header={{ text: 'weiran4j 后台' }}
                />
            </Sider>
            <Layout>
                <Header
                    style={{
                        display: 'flex',
                        justifyContent: 'flex-end',
                        alignItems: 'center',
                        padding: '0 24px',
                        background: 'var(--semi-color-bg-1)',
                    }}
                >
                    {account && (
                        <Dropdown
                            render={
                                <Dropdown.Menu>
                                    <Dropdown.Item onClick={onLogout}>退出登录</Dropdown.Item>
                                </Dropdown.Menu>
                            }
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                                <Avatar size="small">{account.displayName.slice(0, 1)}</Avatar>
                                <span>{account.displayName}</span>
                            </div>
                        </Dropdown>
                    )}
                </Header>
                <Content style={{ padding: 24, overflow: 'auto' }}>
                    <Outlet />
                </Content>
            </Layout>
        </Layout>
    );
}
