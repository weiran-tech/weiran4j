import { act, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { LEGACY_THEME_STORAGE_KEY, PREFERENCES_OWNER_KEY, PREFERENCES_STORAGE_KEY, savePreferences } from '@/lib/preferences-storage';
import { fakeJwt, mockFetch } from '@/test/helpers';
import { request } from '@/utils/request';
import { clearToken, getToken, setToken } from '@/utils/token';
import { PreferencesProvider } from '../PreferencesProvider';
import { defaultPreferences, usePreferences, type UserPreferences } from '../usePreferences';

const API = '/api/auth/preferences';

function Probe() {
    const { preferences, setPreferences, resetPreferences } = usePreferences();
    return (
        <div>
            <span data-testid="state">{`${preferences.colorMode}|${preferences.tablePageSize}|${preferences.showLogo ? 'logo' : 'nologo'}`}</span>
            <button onClick={() => setPreferences({ tablePageSize: 50 })}>size50</button>
            <button onClick={() => setPreferences({ tablePageSize: 100 })}>size100</button>
            <button onClick={() => setPreferences({ showLogo: false })}>nologo</button>
            <button onClick={resetPreferences}>reset</button>
        </div>
    );
}

const state = () => screen.getByTestId('state').textContent;
const stored = () => JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? 'null') as UserPreferences | null;

function renderProvider() {
    return render(
        <PreferencesProvider>
            <Probe />
        </PreferencesProvider>,
    );
}

describe('PreferencesProvider', () => {
    afterEach(() => {
        clearToken();
        vi.unstubAllGlobals();
        vi.useRealTimers();
    });

    it('未登录：不发请求，修改只写本地', async () => {
        const { calls } = mockFetch({});
        renderProvider();
        act(() => screen.getByText('size50').click());
        expect(state()).toBe('light|50|logo');
        expect(stored()?.tablePageSize).toBe(50);
        await new Promise((r) => setTimeout(r, 600));
        expect(calls).toHaveLength(0);
    });

    it('已登录：GET 服务端偏好合并覆盖本地缓存，非法字段回落', async () => {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, tablePageSize: 50 }));
        setToken('t');
        mockFetch({ [`GET ${API}`]: { colorMode: 'dark', showLogo: false, tableSize: 'huge' } });
        renderProvider();
        expect(state()).toBe('light|50|logo');
        await waitFor(() => expect(state()).toBe('dark|20|nologo'));
        expect(stored()).toMatchObject({ colorMode: 'dark', tablePageSize: 20, showLogo: false, tableSize: 'small' });
    });

    it('服务端无数据（null）且本地缓存属于当前用户：把本地缓存迁上去', async () => {
        savePreferences({ ...defaultPreferences, colorMode: 'system' }, 1);
        setToken(fakeJwt(1));
        const { calls } = mockFetch({ [`GET ${API}`]: null, [`PUT ${API}`]: null });
        renderProvider();
        await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
        expect(calls.find((c) => c.method === 'PUT')?.body).toMatchObject({ colorMode: 'system' });
    });

    it('换账号不继承：A 退出后清本地缓存；B 登录且服务端为 null 时拿默认值，不把 A 的偏好 PUT 给 B', async () => {
        const a = fakeJwt(1);
        const { calls } = mockFetch({
            [`GET ${API}`]: (init?: RequestInit) =>
                new Headers(init?.headers).get('Authorization') === `Bearer ${a}` ? { ...defaultPreferences, colorMode: 'dark', tablePageSize: 50 } : null,
            [`PUT ${API}`]: null,
        });
        setToken(a);
        renderProvider();
        await waitFor(() => expect(state()).toBe('dark|50|logo'));
        expect(localStorage.getItem(PREFERENCES_OWNER_KEY)).toBe('1');

        act(() => clearToken());
        expect(state()).toBe('light|20|logo');
        expect(stored()).toBeNull();
        expect(localStorage.getItem(PREFERENCES_OWNER_KEY)).toBeNull();

        act(() => setToken(fakeJwt(2)));
        await waitFor(() => expect(calls.filter((c) => c.method === 'GET')).toHaveLength(2));
        await new Promise((r) => setTimeout(r, 600));
        expect(state()).toBe('light|20|logo');
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    });

    it('B 登录时本地还留着 A 的缓存（如令牌被直接替换）：服务端 null 也不迁移，回到默认值并记为 B 的', async () => {
        savePreferences({ ...defaultPreferences, colorMode: 'dark', tablePageSize: 50 }, 1);
        setToken(fakeJwt(2));
        const { calls } = mockFetch({ [`GET ${API}`]: null, [`PUT ${API}`]: null });
        renderProvider();
        await waitFor(() => expect(state()).toBe('light|20|logo'));
        await new Promise((r) => setTimeout(r, 600));
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
        expect(localStorage.getItem(PREFERENCES_OWNER_KEY)).toBe('2');
    });

    it('旧格式缓存（没有归属）不迁移给任何账号', async () => {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, colorMode: 'dark' }));
        setToken(fakeJwt(1));
        const { calls } = mockFetch({ [`GET ${API}`]: null, [`PUT ${API}`]: null });
        renderProvider();
        expect(state()).toBe('dark|20|logo');
        await waitFor(() => expect(state()).toBe('light|20|logo'));
        await new Promise((r) => setTimeout(r, 600));
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    });

    it('旧版 weiran_theme：登录前照常迁入本地偏好（首屏不闪），但归属未知，登录后不上服务端', async () => {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ mode: 'dark', color: 'green' }));
        setToken(fakeJwt(1));
        const { calls } = mockFetch({ [`GET ${API}`]: null, [`PUT ${API}`]: null });
        renderProvider();
        expect(state()).toBe('dark|20|logo');
        expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
        await waitFor(() => expect(state()).toBe('light|20|logo'));
        await new Promise((r) => setTimeout(r, 600));
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
    });

    it('401 清会话（request.ts 直接清令牌）后本地偏好缓存被清、回到默认值', async () => {
        setToken(fakeJwt(1));
        mockFetch({
            [`GET ${API}`]: { ...defaultPreferences, colorMode: 'dark' },
            'GET /api/users': () => Response.json({ code: 40100, message: '登录已失效', data: null }, { status: 401 }),
        });
        renderProvider();
        await waitFor(() => expect(state()).toBe('dark|20|logo'));
        expect(stored()?.colorMode).toBe('dark');

        await act(async () => {
            await request('/api/users', { silent: true }).catch(() => undefined);
        });
        expect(getToken()).toBeNull();
        expect(state()).toBe('light|20|logo');
        expect(stored()).toBeNull();
        expect(localStorage.getItem(PREFERENCES_OWNER_KEY)).toBeNull();
    });

    it('GET 失败时沿用本地缓存', async () => {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, colorMode: 'dark' }));
        setToken('t');
        const { calls } = mockFetch({
            [`GET ${API}`]: () => Response.json({ code: 50000, message: '服务器错误', data: null }, { status: 500 }),
        });
        renderProvider();
        await waitFor(() => expect(calls).toHaveLength(1));
        expect(state()).toBe('dark|20|logo');
    });

    it('连续修改 500ms 防抖，只 PUT 一次最终值', async () => {
        setToken('t');
        const { calls } = mockFetch({ [`GET ${API}`]: { ...defaultPreferences }, [`PUT ${API}`]: null });
        renderProvider();
        await waitFor(() => expect(calls).toHaveLength(1));
        vi.useFakeTimers();
        act(() => screen.getByText('size50').click());
        act(() => screen.getByText('nologo').click());
        act(() => screen.getByText('size100').click());
        await act(() => vi.advanceTimersByTimeAsync(499));
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(0);
        await act(() => vi.advanceTimersByTimeAsync(1));
        const puts = calls.filter((c) => c.method === 'PUT');
        expect(puts).toHaveLength(1);
        expect(puts[0]?.body).toMatchObject({ tablePageSize: 100, showLogo: false });
        expect(Object.keys(puts[0]?.body as object)).toHaveLength(44);
    });

    it('恢复默认：清本地缓存、取消待发的写入、立即 PUT 默认值', async () => {
        setToken('t');
        const { calls } = mockFetch({ [`GET ${API}`]: { ...defaultPreferences, colorMode: 'dark' }, [`PUT ${API}`]: null });
        renderProvider();
        await waitFor(() => expect(state()).toBe('dark|20|logo'));
        act(() => screen.getByText('size50').click());
        act(() => screen.getByText('reset').click());
        expect(state()).toBe('light|20|logo');
        expect(localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();
        await waitFor(() => expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1));
        expect(calls.find((c) => c.method === 'PUT')?.body).toEqual(defaultPreferences);
        await new Promise((r) => setTimeout(r, 600));
        expect(calls.filter((c) => c.method === 'PUT')).toHaveLength(1);
    });

    it('在 Provider 外使用直接报错', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Probe />)).toThrow(/PreferencesProvider/);
    });
});
