import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BanListPage } from '../BanListPage';

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
            <BanListPage />
        </QueryClientProvider>,
    );
}

describe('封禁管理页面', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('列表加载后展示封禁记录', async () => {
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
                                accountType: 'backend',
                                type: 'ip',
                                value: '192.168.1.100',
                                ipStart: 0,
                                ipEnd: 0,
                                note: null,
                                createdAt: '2026-09-05T00:00:00',
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

        await waitFor(() => expect(screen.getByText('192.168.1.100')).toBeInTheDocument());
    });

    it('点击删除后触发解封请求', async () => {
        const fetchMock = vi.fn().mockResolvedValue(
            jsonResponse({
                code: '0',
                message: '',
                timestamp: 1,
                requestId: null,
                data: {
                    items: [
                        {
                            id: 1,
                            accountType: 'backend',
                            type: 'ip',
                            value: '192.168.1.100',
                            ipStart: 0,
                            ipEnd: 0,
                            note: null,
                            createdAt: '2026-09-05T00:00:00',
                        },
                    ],
                    total: 1,
                    page: 1,
                    size: 20,
                },
            }),
        );
        vi.stubGlobal('fetch', fetchMock);

        renderPage();

        await waitFor(() => expect(screen.getByText('192.168.1.100')).toBeInTheDocument());
        fireEvent.click(screen.getByText('删除'));

        const confirmButton = await screen.findByText('确定');
        fireEvent.click(confirmButton);

        await waitFor(() =>
            expect(fetchMock).toHaveBeenCalledWith(
                expect.stringContaining('/api/v1/bans/1/delete'),
                expect.objectContaining({ method: 'POST' }),
            ),
        );
    });
});
