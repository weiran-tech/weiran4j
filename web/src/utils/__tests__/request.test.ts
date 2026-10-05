import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@douyinfe/semi-ui', () => ({ Toast: { error: vi.fn() } }));

import { Toast } from '@douyinfe/semi-ui';
import { ApiError, http, request } from '../request';
import { signIn } from '@/test/session';
import { getSession } from '../session';

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

    it('写请求带 X-CSRF-Token（值等于会话 Cookie）与 JSON 请求体，Cookie 由浏览器同源携带', async () => {
        const session = signIn(7, 'abc');
        respond({ code: 0, message: 'ok', data: null });
        await http.put('/api/roles/1/menus', { menuIds: [1, 2] });
        const [url, init] = vi.mocked(fetch).mock.calls[0]!;
        expect(url).toBe('/api/roles/1/menus');
        expect(init?.method).toBe('PUT');
        expect(init?.credentials).toBe('same-origin');
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBe(session);
        expect(headers.Authorization).toBeUndefined();
        expect(init?.body).toBe(JSON.stringify({ menuIds: [1, 2] }));
    });

    it.each(['POST', 'DELETE'] as const)('%s 同样带 X-CSRF-Token', async (method) => {
        const session = signIn();
        respond({ code: 0, message: 'ok', data: null });
        await request('/api/x', { method, ...(method === 'POST' ? { body: {} } : {}) });
        const init = vi.mocked(fetch).mock.calls[0]![1];
        expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(session);
    });

    it('GET 不带 X-CSRF-Token，也不带 Authorization', async () => {
        signIn();
        respond({ code: 0, message: 'ok', data: null });
        await http.get('/api/x');
        const init = vi.mocked(fetch).mock.calls[0]![1];
        expect(init?.credentials).toBe('same-origin');
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBeUndefined();
        expect(headers.Authorization).toBeUndefined();
    });

    it('未登录时写请求不带 X-CSRF-Token（如登录接口）', async () => {
        respond({ code: 0, message: 'ok', data: null });
        await http.post('/api/auth/login', { username: 'a', password: 'b' });
        const init = vi.mocked(fetch).mock.calls[0]![1];
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBeUndefined();
        expect(headers.Authorization).toBeUndefined();
    });

    it('40100 清除会话', async () => {
        signIn();
        respond({ code: 40100, message: '登录已失效，请重新登录', data: null }, 401);
        await expect(request('/api/auth/me')).rejects.toMatchObject({ code: 40100 });
        expect(getSession()).toBeNull();
    });

    it('HTTP 401 且响应体不是 JSON 也视为会话失效', async () => {
        signIn();
        respond('<html>401</html>', 401);
        await expect(request('/api/x')).rejects.toMatchObject({ code: 40100 });
        expect(getSession()).toBeNull();
    });

    it('40101（密码错误）不清会话', async () => {
        const session = signIn();
        respond({ code: 40101, message: '用户名或密码错误', data: null }, 401);
        await expect(request('/api/auth/password', { method: 'PUT', body: {} })).rejects.toMatchObject({ code: 40101 });
        expect(getSession()).toBe(session);
    });

    it('40302（CSRF 校验失败）按普通业务错误 Toast，不清会话', async () => {
        const session = signIn();
        respond({ code: 40302, message: '请求校验失败，请刷新页面后重试', data: null }, 403);
        await expect(request('/api/users', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 40302, status: 403 });
        expect(Toast.error).toHaveBeenCalledWith('请求校验失败，请刷新页面后重试');
        expect(getSession()).toBe(session);
    });

    it('网络错误转成 code -1', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
        await expect(request('/api/x')).rejects.toMatchObject({ code: -1 });
        expect(Toast.error).toHaveBeenCalledWith('网络请求失败，请检查网络连接');
    });
});
