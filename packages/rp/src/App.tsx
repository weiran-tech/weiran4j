import { PrototypeTools } from '@/prototype/PrototypeTools';
import { installVersionNotesShortcut } from '@/prototype/version-notes';
import { notebookContext } from '@/prototype/notebook-context';
import { workErrors } from '../prototype/version-work.mjs';
import conflictResolutions from '../prototype/conflict-resolutions.json';
import { PageConflictNotice } from '@/prototype/PageConflictNotice';
import { Button, Empty, Spin } from '@douyinfe/semi-ui';
import { Suspense, createElement, useEffect, useMemo, type ComponentType, type LazyExoticComponent } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { runtimeVersion, routeVersion } from '@/prototype/runtime';
import { releases, sitePath } from '@/prototype/catalog';
import { globalPath, namespacePath } from '../prototype/routes.mjs';
import { PortalLayout } from '@/layouts/PortalLayout';
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
const WorkbenchPage = mustLazy('im/WorkbenchPage');
const HelpPage = mustLazy('help/HelpPage');
const ManageGuidePage = mustLazy('prototype/ManageGuidePage');
const VersionsPage = mustLazy('prototype/VersionsPage');
const VersionListPage = mustLazy('prototype/VersionListPage');
const VersionEditorPage = mustLazy('prototype/VersionEditorPage');

const fullPageLoading = (
    <div className="page-loading page-loading--full">
        <Spin size="large" />
    </div>
);

function RedirectToLogin() {
    const location = useLocation();
    const target = new URL(location.pathname + location.search + location.hash, 'https://prototype.invalid');
    // 历史目录借用全局登录页，登录后仍回到请求的历史版本。
    if (routeVersion && routeVersion !== runtimeVersion) target.searchParams.set('version', routeVersion);
    const from = target.pathname + target.search + target.hash;
    const login = globalPath(location.pathname) !== null || routeVersion && routeVersion !== runtimeVersion ? '/rp/login' : '/manage/login';
    const to = from && from !== '/' ? `${login}?redirect=${encodeURIComponent(from)}` : login;
    return <Navigate to={to} replace />;
}

function RedirectPrototypeCatalog() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    params.set('tab', 'prototype');
    return <Navigate replace to={`/rp/versions?${params}${location.hash}`} />;
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
                {/* 客服工作台：独立窗口，不带管理端布局 */}
                <Route path="/manage/im/workbench" element={<WorkbenchPage />} />
                <Route element={<AdminLayout menus={menus} routes={routes} />}>
                    <Route index element={<Navigate to={HOME_PATH} replace />} />
                    {routes.map((r) => (
                        <Route key={r.id} path={r.path} element={menuRouteElement(r)} />
                    ))}
                    {/* 首页是欢迎页，不需要权限；角色没勾首页菜单时也要能落地 */}
                    {!hasDashboardRoute && <Route path={HOME_PATH} element={<DashboardPage />} />}
                    <Route path="/manage/profile" element={<ProfilePage />} />
                    <Route path="/rp/manage" element={<ManageGuidePage />} />
                    <Route path="/manage/403" element={<ForbiddenPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Route>
            </Routes>
        </PermissionContext.Provider>
    );
}

export function App() {
    const { isLoggedIn } = useAuth();
    const location = useLocation();
    useEffect(() => installVersionNotesShortcut(() => routeVersion ? notebookContext(routeVersion) : null), []);
    const workingRelease = releases.find((item) => item.id === (routeVersion || runtimeVersion));
    const incoming = location.pathname + location.search + location.hash;
    const publicPath = globalPath(incoming);
    if (publicPath !== null && publicPath !== incoming) return <Navigate to={publicPath} replace />;
    const canonical = namespacePath(location.pathname);
    if (canonical !== location.pathname) return <Navigate to={canonical + location.search + location.hash} replace />;
    if (routeVersion && !releases.some((release) => release.id === routeVersion)) return <div className="proto-page" role="alert"><h1>版本不存在</h1><p>找不到 {routeVersion}，不会使用当前版本代替。</p><a href={sitePath('/rp/versions', runtimeVersion)}>返回当前版本</a></div>;
    if (routeVersion && routeVersion !== runtimeVersion && location.pathname.startsWith('/manage') && location.pathname !== '/manage/login') return <Navigate to={'/rp/manage' + location.search} replace />;
    if (['/rp/versions', '/rp/workflow', '/rp/demo'].includes(location.pathname)) {
        const params = new URLSearchParams(location.search);
        if (['compare', 'baseline', 'view'].some((key) => params.has(key))) {
            for (const key of ['compare', 'baseline', 'view']) params.delete(key);
            return <Navigate replace to={location.pathname + (params.size ? `?${params}` : '') + location.hash} />;
        }
    }
    if (location.pathname.startsWith('/manage') && workingRelease && !workingRelease.supersededBy && workErrors(workingRelease, releases, conflictResolutions).length) return <div className="proto-page"><PageConflictNotice release={workingRelease} /><Link to="/rp/versions">返回版本详情处理冲突</Link></div>;
    const requested = new URLSearchParams(location.search).get('version');
    if (requested && requested !== runtimeVersion && location.pathname.startsWith('/manage/') && location.pathname !== '/manage/login') return <div className="proto-page" role="alert" aria-label="版本不一致"><h1>版本与页面构建不一致</h1><p>当前路径属于 {runtimeVersion}，不能通过参数切换为 {requested} 的业务页面。</p><Link to={`/rp/versions?version=${encodeURIComponent(requested)}`}>打开所选版本目录</Link><p><a href={sitePath('/manage')}>返回当前版本管理端</a></p></div>;
    return (
        <><PrototypeTools /><Suspense fallback={fullPageLoading}>
            <Routes>
                <Route element={<PortalLayout />}>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/versions" element={<VersionListPage />} />
                    <Route path="/help/*" element={<HelpPage />} />
                    <Route path="/docs/*" element={<HelpPage />} />
                    <Route path="/rp/versions" element={<VersionsPage />} />
                    <Route path="/rp/workflow" element={<VersionsPage />} />
                    <Route path="/rp/editor" element={<VersionEditorPage />} />
                    <Route path="/rp/demo" element={<RedirectPrototypeCatalog />} />
                    <Route path="/rp/scenes" element={<RedirectPrototypeCatalog />} />
                </Route>
                <Route path="/manage/login" element={isLoggedIn ? <RedirectFromLogin /> : <LoginPage />} />
                <Route path="/rp/login" element={isLoggedIn ? <RedirectFromLogin /> : <LoginPage />} />
                <Route path="*" element={isLoggedIn ? <AuthedApp /> : <RedirectToLogin />} />
            </Routes>
        </Suspense></>
    );
}
