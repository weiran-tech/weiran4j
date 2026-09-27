import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/lib/query';
import { setToken } from '@/utils/token';
import { authKeys, useSaveFavoriteMenus } from '../auth';

interface Pending {
    body: unknown;
    resolve: (res: Response) => void;
}

/** 手动控制每个 PUT 何时返回；GET 返回服务端当前值 */
function stubFetch(server: { saved: number[] }) {
    const puts: Pending[] = [];
    vi.stubGlobal(
        'fetch',
        vi.fn((_input: RequestInfo | URL, init?: RequestInit) => {
            if (init?.method === 'PUT') {
                return new Promise<Response>((resolve) => puts.push({ body: JSON.parse(init.body as string), resolve }));
            }
            return Promise.resolve(Response.json({ code: 0, message: 'ok', data: server.saved }));
        }),
    );
    return puts;
}

const ok = () => Response.json({ code: 0, message: 'ok', data: null });
const fail = () => Response.json({ code: 40000, message: '菜单不可收藏', data: null }, { status: 400 });

describe('useSaveFavoriteMenus', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('连续两次保存串行发出；第一次失败时不回滚掉还在排队的第二次', async () => {
        setToken('t');
        const server = { saved: [] as number[] };
        const puts = stubFetch(server);
        const client = createQueryClient();
        const key = [...authKeys.favoriteMenus, 't'];
        client.setQueryData(key, []);
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        const { result } = renderHook(() => useSaveFavoriteMenus(), { wrapper });

        act(() => {
            result.current.mutate([3]);
            result.current.mutate([3, 4]);
        });
        await waitFor(() => expect(puts).toHaveLength(1));
        // 第二次在第一次结束前不发（避免乱序到达）
        await new Promise((r) => setTimeout(r, 20));
        expect(puts).toHaveLength(1);

        act(() => {
            puts[0]?.resolve(fail());
        });
        await waitFor(() => expect(puts).toHaveLength(2));
        expect(puts[1]?.body).toEqual({ menuIds: [3, 4] });
        // 第一次失败没有把界面回滚到 []，第二次的乐观值还在
        expect(client.getQueryData(key)).toEqual([3, 4]);

        server.saved = [3, 4];
        act(() => {
            puts[1]?.resolve(ok());
        });
        await waitFor(() => expect(client.getQueryData(key)).toEqual([3, 4]));
    });

    it('只有一次保存且失败：回滚到修改前', async () => {
        setToken('t');
        const puts = stubFetch({ saved: [1] });
        const client = createQueryClient();
        const key = [...authKeys.favoriteMenus, 't'];
        client.setQueryData(key, [1]);
        const wrapper = ({ children }: { children: ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
        const { result } = renderHook(() => useSaveFavoriteMenus(), { wrapper });

        act(() => result.current.mutate([1, 2]));
        await waitFor(() => expect(client.getQueryData(key)).toEqual([1, 2]));
        await waitFor(() => expect(puts).toHaveLength(1));
        act(() => {
            puts[0]?.resolve(fail());
        });
        await waitFor(() => expect(client.getQueryData(key)).toEqual([1]));
    });
});
