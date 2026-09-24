import { Navigate, Route, Routes } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { RequireAuth } from './components/RequireAuth';
import { AdminLayout } from './layouts/AdminLayout';
import { RoleListPage } from './pages/role/RoleListPage';
import { AccountListPage } from './pages/account/AccountListPage';
import { LoginLogPage } from './pages/account/LoginLogPage';
import { BanListPage } from './pages/ban/BanListPage';

/**
 * 路由表。
 *
 * 后台业务模块以 AdminLayout 为父路由、各业务页面为嵌套子路由组织
 * （admin-console-shell spec FR-004）：新增业务模块页面只需要在这里追加一个
 * `<Route>`，不需要改动 AdminLayout 本身的实现。鉴权统一走 RequireAuth，
 * 不在页面内各自判断。
 */
export function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route
                element={
                    <RequireAuth>
                        <AdminLayout />
                    </RequireAuth>
                }
            >
                <Route path="/" element={<HomePage />} />
                <Route path="/roles" element={<RoleListPage />} />
                <Route path="/accounts" element={<AccountListPage />} />
                <Route path="/accounts/:id/login-logs" element={<LoginLogPage />} />
                <Route path="/bans" element={<BanListPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
    );
}
