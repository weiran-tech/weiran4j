import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { AccountListPage } from '../AccountListPage';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

function renderPage() {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    return render(
        <QueryClientProvider client={queryClient}>
            <MemoryRouter>
                <AccountListPage />
            </MemoryRouter>
        </QueryClientProvider>,
    );
}

describe('账号管理页面', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('列表加载后展示账号数据', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({
                    code: '0',
                    message: '',
                    timestamp: 1,
                    requestId: null,
                    data: {
                        items: [
                            { id: 1, username: 'zhangsan', mobile: '13800138000', email: null, accountType: 'backend', enabled: true },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                    },
                }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByText('zhangsan')).toBeInTheDocument());
        expect(screen.getByText('13800138000')).toBeInTheDocument();
    });

    it('点击新增账号打开表单弹层', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({ code: '0', message: '', timestamp: 1, requestId: null, data: { items: [], total: 0, page: 1, size: 20 } }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByText('账号管理')).toBeInTheDocument());
        fireEvent.click(screen.getByText('新增账号'));

        expect(await screen.findAllByText('用户名')).not.toHaveLength(0);
    });
});
