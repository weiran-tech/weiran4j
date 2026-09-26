import { fireEvent, screen, waitFor } from '@testing-library/react';
import { Route, Routes } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { getToken } from '@/utils/token';
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

    it('登录成功保存令牌并跳到 redirect', async () => {
        const { calls } = mockFetch({
            'POST /api/auth/login': { accessToken: 'jwt-token', tokenType: 'Bearer', expiresIn: 43200 },
        });
        renderLogin('/login?redirect=%2Fsystem%2Fusers');
        fill(' admin ', 'admin123');
        fireEvent.click(screen.getByRole('button', { name: '登录' }));

        await waitFor(() => expect(screen.getByText('已跳转')).toBeInTheDocument());
        expect(getToken()).toBe('jwt-token');
        expect(calls[0]).toMatchObject({ method: 'POST', path: '/api/auth/login', body: { username: 'admin', password: 'admin123' } });
    });

    it('密码错误时展示后端 message，不保存令牌', async () => {
        mockFetch({
            'POST /api/auth/login': () =>
                Response.json({ code: 40101, message: '用户名或密码错误', data: null }, { status: 401 }),
        });
        renderLogin();
        fill('admin', 'wrong');
        fireEvent.click(screen.getByRole('button', { name: '登录' }));

        expect(await screen.findByText('用户名或密码错误')).toBeInTheDocument();
        expect(getToken()).toBeNull();
    });

    it('必填校验：未填写不发请求', async () => {
        const { fn } = mockFetch({});
        renderLogin();
        fireEvent.click(screen.getByRole('button', { name: '登录' }));
        expect(await screen.findByText('请输入用户名')).toBeInTheDocument();
        expect(fn).not.toHaveBeenCalled();
    });
});
