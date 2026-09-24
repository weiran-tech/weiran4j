import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { RequireAuth } from '../RequireAuth';
import { TOKEN_KEY } from '../../lib/api';

function renderProtectedRoute() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/roles']}>
                <Routes>
                    <Route path="/login" element={<div>登录页</div>} />
                    <Route
                        path="/roles"
                        element={
                            <RequireAuth>
                                <div>角色管理页面</div>
                            </RequireAuth>
                        }
                    />
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('RequireAuth 未登录重定向', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('未登录用户访问后台业务路径被重定向到登录页', async () => {
        renderProtectedRoute();

        await waitFor(() => expect(screen.getByText('登录页')).toBeInTheDocument());
        expect(screen.queryByText('角色管理页面')).not.toBeInTheDocument();
    });

    it('携带无效令牌访问时同样被重定向到登录页', async () => {
        localStorage.setItem(TOKEN_KEY, 'invalid-token');
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                new Response(
                    JSON.stringify({ code: 'WEIRAN.SYSTEM.TOKEN_INVALID', message: '无效', timestamp: 1, requestId: null, data: null }),
                    { status: 401, headers: { 'Content-Type': 'application/json' } },
                ),
            ),
        );

        renderProtectedRoute();

        await waitFor(() => expect(screen.getByText('登录页')).toBeInTheDocument());
    });
});
