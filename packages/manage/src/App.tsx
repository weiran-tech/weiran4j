import { Button, Empty, Spin } from '@douyinfe/semi-ui';
import { Suspense, useMemo } from 'react';
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import { PageErrorBoundary } from '@/components/PageErrorBoundary';
import { RecoverablePage } from '@/components/RecoverablePage';
import { HOME_PATH } from '@/config';
import { useMyMenus, useAuthorizationSnapshot } from '@/hooks/queries/auth';
import { useAuthorizationCalibration } from '@/hooks/useAuthorizationCalibration';
import { AuthorizationFeedback } from '@/components/AuthorizationFeedback';
import { useSession } from '@/utils/session';
import { useAuth } from '@/hooks/useAuth';
import { PermissionContext } from '@/hooks/usePermission';
import { AdminLayout } from '@/layouts/AdminLayout';
import { menusToRoutes, type MenuRoute } from '@/utils/menu';
import { resolvePageLoader } from '@/utils/page-registry';
import { safeRedirect } from '@/utils/redirect';

/** 注册表提供稳定 loader，每个路由实例独立持有可重试的 lazy。 */
function RegisteredPage({ component }: { component: string }) {
    const navigate = useNavigate();
    const loader = resolvePageLoader(component);
    if (!loader) return <Empty title="页面不存在" />;
    return <RecoverablePage key={component} loader={loader} onHome={() => void navigate(HOME_PATH)} />;
}

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

/** 菜单路由的页面元素；每个路由实例独立负责加载与错误恢复。 */
function menuRouteElement(route: MenuRoute) {
    return route.resolved && route.component ? <RegisteredPage component={route.component} /> : <MissingPage route={route} />;
}

/** 已登录：拉 me + 菜单，按菜单注册路由 */
function AuthedApp() {
    const { meQuery, clearSession } = useAuth();
    const menusQuery = useMyMenus();
    const snapshot = useAuthorizationSnapshot();
    const session = useSession();
    useAuthorizationCalibration(session, () => snapshot.refetch({ cancelRefetch: false }));
    const menus = useMemo(() => menusQuery.data ?? [], [menusQuery.data]);
    const routes = useMemo(() => menusToRoutes(menus), [menus]);
    const hasDashboardRoute = routes.some((r) => r.path === HOME_PATH);

    if (meQuery.isPending || menusQuery.isPending) return fullPageLoading;
    if ((meQuery.isError || menusQuery.isError) && !meQuery.data) {
        return (
            <div className="page-loading page-loading--full">
                <Empty
                    title="加载用户信息失败"
                    description={(meQuery.error ?? menusQuery.error)?.message ?? '请稍后重试'}
                >
                    <Button
                        onClick={() => {
                            void meQuery.refetch();
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
        <PermissionContext.Provider value={meQuery.data?.permissions ?? []}>
            <Routes>
                <Route element={<AdminLayout menus={menus} routes={routes} authorizationFeedback={<AuthorizationFeedback failed={snapshot.isError} loading={snapshot.isFetching} onRetry={() => void snapshot.refetch({ cancelRefetch: false })} />} />}>
                    <Route index element={<Navigate to={HOME_PATH} replace />} />
                    {routes.map((r) => (
                        <Route key={r.id} path={r.path} element={menuRouteElement(r)} />
                    ))}
                    {/* 首页是欢迎页，不需要权限；角色没勾首页菜单时也要能落地 */}
                    {!hasDashboardRoute && <Route path={HOME_PATH} element={<RegisteredPage component="dashboard/DashboardPage" />} />}
                    <Route path="/profile" element={<RegisteredPage component="profile/ProfilePage" />} />
                    <Route path="/403" element={<RegisteredPage component="forbidden/ForbiddenPage" />} />
                    <Route path="*" element={<RegisteredPage component="not-found/NotFoundPage" />} />
                </Route>
            </Routes>
        </PermissionContext.Provider>
    );
}

export function App() {
    const { isLoggedIn } = useAuth();
    const location = useLocation();
    return (
        <PageErrorBoundary resetKey={location.pathname} onHome={() => window.location.assign(HOME_PATH)}>
            <Suspense fallback={fullPageLoading}>
                <Routes>
                    <Route path="/login" element={isLoggedIn ? <RedirectFromLogin /> : <RegisteredPage component="login/LoginPage" />} />
                    <Route path="*" element={isLoggedIn ? <AuthedApp /> : <RedirectToLogin />} />
                </Routes>
            </Suspense>
        </PageErrorBoundary>
    );
}
