import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { getSession } from '@/utils/session';
import LoginPage from '../LoginPage';

function renderLogin(route = '/login') {
    return renderWithProviders(
        <Routes>
            <Route path="/login" element={<LoginPage />} />
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
        expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/auth/login', body: { username: 'admin', password: 'admin123' } });
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
        const { fn } = mockFetch({});
        renderLogin();
        fireEvent.click(screen.getByRole('button', { name: '登录' }));
        expect(await screen.findByText('请输入用户名')).toBeInTheDocument();
        expect(fn).not.toHaveBeenCalled();
    });
});
