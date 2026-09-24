import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { RoleListPage } from '../RoleListPage';

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
            <RoleListPage />
        </QueryClientProvider>,
    );
}

describe('角色管理页面', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('列表加载后展示角色数据', async () => {
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
                            {
                                id: 1,
                                name: 'editor',
                                title: '编辑',
                                description: '',
                                accountType: 'backend',
                                enabled: true,
                                system: false,
                            },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                    },
                }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByText('editor')).toBeInTheDocument());
        expect(screen.getByText('启用')).toBeInTheDocument();
    });

    it('系统内置角色的删除按钮被禁用', async () => {
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
                            {
                                id: 1,
                                name: 'super',
                                title: '超级管理员',
                                description: '',
                                accountType: 'backend',
                                enabled: true,
                                system: true,
                            },
                        ],
                        total: 1,
                        page: 1,
                        size: 20,
                    },
                }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByText('super')).toBeInTheDocument());
        const deleteButtons = screen.getAllByText('删除');
        expect(deleteButtons[0]?.closest('button')).toBeDisabled();
    });

    it('点击新增角色打开表单弹层', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({ code: '0', message: '', timestamp: 1, requestId: null, data: { items: [], total: 0, page: 1, size: 20 } }),
            ),
        );

        renderPage();

        await waitFor(() => expect(screen.getByText('角色管理')).toBeInTheDocument());
        fireEvent.click(screen.getByText('新增角色'));

        expect(await screen.findAllByText('角色标识')).not.toHaveLength(0);
    });
});
