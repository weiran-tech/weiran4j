import { Button, Empty, Spin } from '@douyinfe/semi-ui';
import { Suspense, createElement, useMemo, type ComponentType, type LazyExoticComponent } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { HOME_PATH } from '@/config';
import { useMyMenus } from '@/hooks/queries/auth';
import { useAuth } from '@/hooks/useAuth';
import { PermissionContext } from '@/hooks/usePermission';
import { AdminLayout } from '@/layouts/AdminLayout';
import { menusToRoutes, type MenuRoute } from '@/utils/menu';
import { lazyPageComponent } from '@/utils/page-registry';
import { safeRedirect } from '@/utils/redirect';

function mustLazy(component: string): LazyExoticComponent<ComponentType> {
    const page = lazyPageComponent(component);
    if (!page) throw new Error(`页面组件不存在：${component}`);
    return page;
}

// 固定页面也走 page-registry，避免同一文件既被静态又被动态导入
const LoginPage = mustLazy('login/LoginPage');
const DashboardPage = mustLazy('dashboard/DashboardPage');
const ProfilePage = mustLazy('profile/ProfilePage');
const ForbiddenPage = mustLazy('forbidden/ForbiddenPage');
const NotFoundPage = mustLazy('not-found/NotFoundPage');

const fullPageLoading = (
    <div className="page-loading page-loading--full">
        <Spin size="large" />
    </div>
);

function RedirectToLogin() {
    const location = useLocation();
    const from = location.pathname + location.search;
    const to = from && from !== '/' ? `/login?redirect=${encodeURIComponent(from)}` : '/login';
    return <Navigate to={to} replace />;
}

function RedirectFromLogin() {
    const location = useLocation();
    return <Navigate to={safeRedirect(new URLSearchParams(location.search).get('redirect'))} replace />;
}

/** 菜单里配置了 component 但前端没有对应文件时的占位 */
function MissingPage({ route }: { route: MenuRoute }) {
    return (
        <div className="page-container">
            <Empty title="页面不存在" description={`菜单「${route.title}」指向的组件 ${route.component ?? '（未配置）'} 在前端找不到`} />
        </div>
    );
}

/** 菜单路由的页面元素；lazy 组件由 page-registry 按路径缓存，引用稳定 */
function menuRouteElement(route: MenuRoute) {
    const Page = route.resolved ? lazyPageComponent(route.component) : null;
    return Page ? createElement(Page) : <MissingPage route={route} />;
}

/** 已登录：拉 me + 菜单，按菜单注册路由 */
function AuthedApp() {
    const { meQuery, clearSession } = useAuth();
    const menusQuery = useMyMenus();
    const menus = useMemo(() => menusQuery.data ?? [], [menusQuery.data]);
    const routes = useMemo(() => menusToRoutes(menus), [menus]);
    const hasDashboardRoute = routes.some((r) => r.path === HOME_PATH);

    if (meQuery.isPending || menusQuery.isPending) return fullPageLoading;
    if (meQuery.isError || menusQuery.isError) {
        return (
            <div className="page-loading page-loading--full">
                <Empty
                    title="加载用户信息失败"
                    description={(meQuery.error ?? menusQuery.error)?.message ?? '请稍后重试'}
                >
                    <Button
                        onClick={() => {
                            void meQuery.refetch();
                            void menusQuery.refetch();
                        }}
                    >
                        重试
                    </Button>
                    <Button theme="borderless" onClick={clearSession} style={{ marginLeft: 8 }}>
                        重新登录
                    </Button>
                </Empty>
            </div>
        );
    }

    return (
        <PermissionContext.Provider value={meQuery.data.permissions}>
            <Routes>
                <Route element={<AdminLayout menus={menus} routes={routes} />}>
                    <Route index element={<Navigate to={HOME_PATH} replace />} />
                    {routes.map((r) => (
                        <Route key={r.id} path={r.path} element={menuRouteElement(r)} />
                    ))}
                    {/* 首页是欢迎页，不需要权限；角色没勾首页菜单时也要能落地 */}
                    {!hasDashboardRoute && <Route path={HOME_PATH} element={<DashboardPage />} />}
                    <Route path="/profile" element={<ProfilePage />} />
                    <Route path="/403" element={<ForbiddenPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </PermissionContext.Provider>
    );
}

export function App() {
    const { isLoggedIn } = useAuth();
    return (
        <Suspense fallback={fullPageLoading}>
            <Routes>
                <Route path="/login" element={isLoggedIn ? <RedirectFromLogin /> : <LoginPage />} />
                <Route path="*" element={isLoggedIn ? <AuthedApp /> : <RedirectToLogin />} />
            </Routes>
        </Suspense>
    );
}
