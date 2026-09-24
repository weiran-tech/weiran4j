import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { AdminLayout } from '../AdminLayout';
import { TOKEN_KEY } from '../../lib/api';
import type { CurrentAccount } from '../../lib/auth';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function renderLayout(account: CurrentAccount) {
    vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue(jsonResponse({ code: '0', message: '', timestamp: 1, requestId: null, data: account })),
    );
    localStorage.setItem(TOKEN_KEY, 'test-token');

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter initialEntries={['/']}>
                <Routes>
                    <Route element={<AdminLayout />}>
                        <Route path="/" element={<div>首页内容</div>} />
                    </Route>
                </Routes>
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('AdminLayout 权限过滤显隐', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        localStorage.clear();
    });

    it('不具备角色管理权限的账号看不到角色管理菜单项', async () => {
        renderLayout({
            accountId: 1,
            displayName: '张三',
            accountType: 'backend',
            roles: [],
            permissions: ['weiran-system:account.index'],
        });

        await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument());

        expect(screen.queryByText('角色管理')).not.toBeInTheDocument();
        expect(screen.getByText('账号管理')).toBeInTheDocument();
    });

    it('持有 super 角色的账号看到全部菜单项', async () => {
        renderLayout({
            accountId: 1,
            displayName: '超级管理员',
            accountType: 'backend',
            roles: ['super'],
            permissions: [],
        });

        await waitFor(() => expect(screen.getByText('超级管理员')).toBeInTheDocument());

        expect(screen.getByText('角色管理')).toBeInTheDocument();
        expect(screen.getByText('账号管理')).toBeInTheDocument();
        expect(screen.getByText('风险拦截')).toBeInTheDocument();
    });

    it('点击登出后本地令牌被清除', async () => {
        renderLayout({
            accountId: 1,
            displayName: '张三',
            accountType: 'backend',
            roles: ['super'],
            permissions: [],
        });

        await waitFor(() => expect(screen.getByText('张三')).toBeInTheDocument());

        expect(localStorage.getItem(TOKEN_KEY)).not.toBeNull();

        // Dropdown 默认按 hover 触发，不是 click（Semi 组件默认 trigger='hover'）。
        fireEvent.mouseEnter(screen.getByText('张三').closest('div')!);
        const logoutItem = await screen.findByText('退出登录');
        fireEvent.click(logoutItem);

        await waitFor(() => expect(localStorage.getItem(TOKEN_KEY)).toBeNull());
    });
});
