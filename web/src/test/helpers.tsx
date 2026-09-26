import { QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { PermissionContext } from '@/hooks/usePermission';
import { createQueryClient } from '@/lib/query';

/** data 本身，或 `(init, url) => data | Response` */
export type MockHandler = unknown;

export interface FetchCall {
    method: string;
    path: string;
    search: string;
    body: unknown;
}

/**
 * 用路由表模拟后端：键为 `METHOD /path`（不含查询串），值为 data 或返回 data 的函数。
 * 返回值自动包成 `{code: 0, message: 'ok', data}`；需要自定义响应时返回 Response 实例。
 * 未匹配的请求返回 404 业务错误，方便在断言里发现漏配。
 */
export function mockFetch(routes: Record<string, MockHandler>) {
    const calls: FetchCall[] = [];
    const fn = vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
        const url = new URL(typeof input === 'string' ? input : input instanceof URL ? input.href : input.url, 'http://localhost');
        const method = (init?.method ?? 'GET').toUpperCase();
        const body: unknown = typeof init?.body === 'string' ? JSON.parse(init.body) : undefined;
        calls.push({ method, path: url.pathname, search: url.search, body });
        const key = `${method} ${url.pathname}`;
        if (!(key in routes)) {
            return Promise.resolve(Response.json({ code: 40400, message: `未模拟的接口 ${key}`, data: null }, { status: 404 }));
        }
        const handler = routes[key];
        const result: unknown = typeof handler === 'function' ? (handler as (i?: RequestInit, u?: URL) => unknown)(init, url) : handler;
        if (result instanceof Response) return Promise.resolve(result);
        return Promise.resolve(Response.json({ code: 0, message: 'ok', data: result ?? null }));
    });
    vi.stubGlobal('fetch', fn);
    return { fn, calls };
}

interface RenderOptions {
    route?: string;
    permissions?: string[];
}

/** 带 QueryClient（每个用例独立）、MemoryRouter、权限上下文渲染 */
export function renderWithProviders(ui: ReactElement, { route = '/', permissions = ['*'] }: RenderOptions = {}) {
    const client = createQueryClient();
    const result = render(
        <QueryClientProvider client={client}>
            <PermissionContext.Provider value={permissions}>
                <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
            </PermissionContext.Provider>
        </QueryClientProvider>,
    );
    return { ...result, client };
}

export function page<T>(list: T[], total = list.length) {
    return { list, total, page: 1, pageSize: 20 };
}
