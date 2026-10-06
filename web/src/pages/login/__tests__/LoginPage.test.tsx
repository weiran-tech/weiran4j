import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders, stubLocationAssign } from '@/test/helpers';
import { getSession } from '@/utils/session';
import LoginPage from '../LoginPage';

/** 把当前路由的查询串渲染出来，断言 ssoError 已从地址栏清掉 */
function SearchProbe() {
    return <div data-testid="search">{useLocation().search}</div>;
}

function renderLogin(route = '/login') {
    return renderWithProviders(
        <Routes>
            <Route
                path="/login"
                element={
                    <>
                        <LoginPage />
                        <SearchProbe />
                    </>
                }
            />
            <Route path="*" element={<div>已跳转</div>} />
        </Routes>,
        { route },
    );
}

function fill(username: string, password: string) {
    fireEvent.change(screen.getByPlaceholderText('请输入用户名'), { target: { value: username } });
    fireEvent.change(screen.getByPlaceholderText('请输入密码'), { target: { value: password } });
}

describe('LoginPage', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('渲染标题与表单', () => {
        mockFetch({});
        renderLogin();
        expect(screen.getByText('Weiran Admin')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: '登录' })).toBeInTheDocument();
    });

    it('登录成功建立会话并跳到 redirect', async () => {
        const { calls } = mockFetch({
            'POST /api/auth/login': () => {
                // 模拟浏览器处理响应里的 Set-Cookie：令牌在 HttpOnly Cookie（JS 不可见），前端只看得到 weiran_csrf
                document.cookie = 'weiran_csrf=1.x; path=/';
                return Response.json({ code: 0, message: 'ok', data: { tokenType: 'Bearer', expiresIn: 43200, userId: 1 } });
            },
        });
        renderLogin('/login?redirect=%2Fsystem%2Fusers');
        fill(' admin ', 'admin123');
        fireEvent.click(screen.getByRole('button', { name: '登录' }));

        await waitFor(() => expect(screen.getByText('已跳转')).toBeInTheDocument());
        expect(getSession()).toBe('1.x');
        // 登录页挂载时还会拉一次 /api/auth/providers，按路径找登录请求
        expect(calls.find((c) => c.path === '/api/auth/login')).toMatchObject({ method: 'POST', body: { username: 'admin', password: 'admin123' } });
    });

    it('密码错误时展示后端 message，不建立会话', async () => {
        mockFetch({
            'POST /api/auth/login': () =>
                Response.json({ code: 40101, message: '用户名或密码错误', data: null }, { status: 401 }),
        });
        renderLogin();
        fill('admin', 'wrong');
        fireEvent.click(screen.getByRole('button', { name: '登录' }));

        expect(await screen.findByText('用户名或密码错误')).toBeInTheDocument();
        expect(getSession()).toBeNull();
    });

    it('必填校验：未填写不发请求', async () => {
        const { calls } = mockFetch({});
        renderLogin();
        fireEvent.click(screen.getByRole('button', { name: '登录' }));
        expect(await screen.findByText('请输入用户名')).toBeInTheDocument();
        expect(calls.some((c) => c.path === '/api/auth/login')).toBe(false);
    });

    describe('外部身份登录', () => {
        const keycloak = { id: 'keycloak', type: 'oidc', name: '统一身份' };
        const cas = { id: 'cas', type: 'cas', name: '校园 CAS' };

        it('没有提供方：与接入前一致，只有密码表单', async () => {
            const { calls } = mockFetch({ 'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [] } });
            renderLogin();
            await waitFor(() => expect(calls.some((c) => c.path === '/api/auth/providers')).toBe(true));
            expect(screen.getByText('使用账号密码进入管理后台')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: /使用 .+ 登录/ })).not.toBeInTheDocument();
            expect(screen.queryByText('管理员应急登录')).not.toBeInTheDocument();
            expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
        });

        it('每个提供方一个按钮，点击整页跳到 authorize（带当前 redirect 与 mode=login）', async () => {
            const assign = stubLocationAssign();
            mockFetch({ 'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [keycloak, cas] } });
            renderLogin('/login?redirect=%2Fsystem%2Fusers%3Fa%3D1');

            fireEvent.click(await screen.findByRole('button', { name: '使用 统一身份 登录' }));
            expect(assign).toHaveBeenCalledWith('/api/auth/sso/keycloak/authorize?redirect=%2Fsystem%2Fusers%3Fa%3D1&mode=login');
            expect(screen.getByRole('button', { name: '使用 校园 CAS 登录' })).toBeInTheDocument();
            // 密码登录开启：表单仍在
            expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
        });

        it('非法 redirect 按站内根路径处理', async () => {
            const assign = stubLocationAssign();
            mockFetch({ 'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [keycloak] } });
            renderLogin('/login?redirect=https%3A%2F%2Fevil.example.com');
            fireEvent.click(await screen.findByRole('button', { name: '使用 统一身份 登录' }));
            expect(assign).toHaveBeenCalledWith('/api/auth/sso/keycloak/authorize?redirect=%2F&mode=login');
        });

        it('密码登录关闭：表单默认收起，点「管理员应急登录」展开', async () => {
            mockFetch({ 'GET /api/auth/providers': { passwordLoginEnabled: false, providers: [keycloak] } });
            renderLogin();
            const toggle = await screen.findByRole('button', { name: '管理员应急登录' });
            expect(screen.queryByPlaceholderText('请输入用户名')).not.toBeInTheDocument();

            fireEvent.click(toggle);
            expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
            expect(screen.queryByRole('button', { name: '管理员应急登录' })).not.toBeInTheDocument();
        });

        it.each([
            ['40102', '外部身份校验失败，请重新登录'],
            ['40303', '账号未开通，请联系管理员'],
            ['40301', '账号已禁用'],
            ['40100', '请先登录'],
            ['50000', '外部登录失败（错误码 50000）'],
        ])('ssoError=%s 显示「%s」，并从地址栏清掉该参数（保留 redirect）', async (code, text) => {
            mockFetch({ 'GET /api/auth/providers': { passwordLoginEnabled: true, providers: [keycloak] } });
            renderLogin(`/login?redirect=%2Fdashboard&ssoError=${code}`);
            expect(await screen.findByText(text)).toBeInTheDocument();
            await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent(/^\?redirect=%2Fdashboard$/));
            // 清参数后提示仍在
            expect(screen.getByText(text)).toBeInTheDocument();
        });

        it('/providers 失败时按无提供方降级，不弹错误', async () => {
            mockFetch({});
            renderLogin();
            expect(screen.getByPlaceholderText('请输入用户名')).toBeInTheDocument();
            await waitFor(() => expect(screen.queryByText(/未模拟的接口/)).not.toBeInTheDocument());
        });
    });
});
