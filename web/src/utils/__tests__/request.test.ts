import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@douyinfe/semi-ui', () => ({ Toast: { error: vi.fn() } }));

import { Toast } from '@douyinfe/semi-ui';
import { ApiError, http, request } from '../request';
import { getToken, setToken, TOKEN_KEY } from '../token';

function respond(body: unknown, status = 200) {
    vi.stubGlobal(
        'fetch',
        vi.fn(() => Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status }))),
    );
}

describe('request', () => {
    beforeEach(() => {
        vi.mocked(Toast.error).mockClear();
    });
    afterEach(() => {
        vi.unstubAllGlobals();
    });

    it('code 为数字 0 时返回 data', async () => {
        respond({ code: 0, message: 'ok', data: { id: 1 } });
        await expect(request<{ id: number }>('/api/x')).resolves.toEqual({ id: 1 });
        expect(Toast.error).not.toHaveBeenCalled();
    });

    it('字符串 "0" 不算成功（旧底座的坑不能复活）', async () => {
        respond({ code: '0', message: 'ok', data: 1 });
        await expect(request('/api/x')).rejects.toBeInstanceOf(ApiError);
    });

    it('非 0 抛 ApiError 并 Toast message', async () => {
        respond({ code: 40900, message: '用户名已存在', data: null }, 409);
        const err = await request('/api/users', { method: 'POST', body: {} }).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe(40900);
        expect((err as ApiError).message).toBe('用户名已存在');
        expect(Toast.error).toHaveBeenCalledWith('用户名已存在');
    });

    it('silent 时不 Toast', async () => {
        respond({ code: 50000, message: '服务器内部错误', data: null }, 500);
        await expect(request('/api/x', { silent: true })).rejects.toThrow('服务器内部错误');
        expect(Toast.error).not.toHaveBeenCalled();
    });

    it('带上 Bearer 令牌与 JSON 请求体', async () => {
        setToken('abc');
        respond({ code: 0, message: 'ok', data: null });
        await http.put('/api/roles/1/menus', { menuIds: [1, 2] });
        const [url, init] = vi.mocked(fetch).mock.calls[0]!;
        expect(url).toBe('/api/roles/1/menus');
        expect(init?.method).toBe('PUT');
        expect((init?.headers as Record<string, string>).Authorization).toBe('Bearer abc');
        expect(init?.body).toBe(JSON.stringify({ menuIds: [1, 2] }));
    });

    it('40100 清除令牌', async () => {
        setToken('expired');
        respond({ code: 40100, message: '登录已失效，请重新登录', data: null }, 401);
        await expect(request('/api/auth/me')).rejects.toMatchObject({ code: 40100 });
        expect(getToken()).toBeNull();
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('HTTP 401 且响应体不是 JSON 也视为会话失效', async () => {
        setToken('expired');
        respond('<html>401</html>', 401);
        await expect(request('/api/x')).rejects.toMatchObject({ code: 40100 });
        expect(getToken()).toBeNull();
    });

    it('40101（密码错误）不清令牌', async () => {
        setToken('valid');
        respond({ code: 40101, message: '用户名或密码错误', data: null }, 401);
        await expect(request('/api/auth/password', { method: 'PUT', body: {} })).rejects.toMatchObject({ code: 40101 });
        expect(getToken()).toBe('valid');
    });

    it('网络错误转成 code -1', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
        await expect(request('/api/x')).rejects.toMatchObject({ code: -1 });
        expect(Toast.error).toHaveBeenCalledWith('网络请求失败，请检查网络连接');
    });
});
