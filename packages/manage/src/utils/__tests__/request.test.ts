import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@douyinfe/semi-ui', () => ({ Toast: { error: vi.fn() } }));

import { Toast } from '@douyinfe/semi-ui';
import { ApiError, http, request } from '../request';
import { signIn } from '@/test/session';
import { getSession } from '../session';

function respond(body: unknown, status = 200, headers: Record<string, string> = {}) {
    vi.stubGlobal(
        'fetch',
        vi.fn(() =>
            Promise.resolve(new Response(typeof body === 'string' ? body : JSON.stringify(body), { status, headers })),
        ),
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
        await expect(request<{ id: number }>('/api-backend/x')).resolves.toEqual({ id: 1 });
        expect(Toast.error).not.toHaveBeenCalled();
    });

    it('字符串 "0" 不算成功（旧底座的坑不能复活）', async () => {
        respond({ code: '0', message: 'ok', data: 1 });
        await expect(request('/api-backend/x')).rejects.toBeInstanceOf(ApiError);
    });

    it('非 0 抛 ApiError 并 Toast message', async () => {
        respond({ code: 100003, message: '用户名已存在', data: null }, 409);
        const err = await request('/api-backend/system/user/list', { method: 'POST', body: {} }).catch((e: unknown) => e);
        expect(err).toBeInstanceOf(ApiError);
        expect((err as ApiError).code).toBe(100003);
        expect((err as ApiError).message).toBe('用户名已存在');
        expect(Toast.error).toHaveBeenCalledWith('用户名已存在');
    });

    it('silent 时不 Toast', async () => {
        respond({ code: 100005, message: '服务器内部错误', data: null }, 500);
        await expect(request('/api-backend/x', { silent: true })).rejects.toThrow('服务器内部错误');
        expect(Toast.error).not.toHaveBeenCalled();
    });

    it('写请求带 X-CSRF-Token（值等于会话 Cookie）与 JSON 请求体，Cookie 由浏览器同源携带', async () => {
        const session = signIn(7, 'abc');
        respond({ code: 0, message: 'ok', data: null });
        await http.put('/api-backend/system/role/assignMenus/1', { menuIds: [1, 2] });
        const [url, init] = vi.mocked(fetch).mock.calls[0]!;
        expect(url).toBe('/api-backend/system/role/assignMenus/1');
        expect(init?.method).toBe('PUT');
        expect(init?.credentials).toBe('same-origin');
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBe(session);
        expect(headers.Authorization).toBeUndefined();
        expect(init?.body).toBe(JSON.stringify({ menuIds: [1, 2] }));
    });

    it('multipart 写请求带 CSRF 且让浏览器生成 boundary Content-Type', async () => {
        const session = signIn(7, 'abc');
        respond({ code: 0, message: 'ok', data: { url: '/system-uploads/image.png' } });
        const body = new FormData();
        body.append('file', new File(['image'], 'image.png', { type: 'image/png' }));
        await http.post('/api-backend/system/media/uploadImage', body);
        const [url, init] = vi.mocked(fetch).mock.calls[0]!;
        expect(url).toBe('/api-backend/system/media/uploadImage');
        expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(session);
        expect((init?.headers as Record<string, string>)['Content-Type']).toBeUndefined();
        expect(init?.body).toBe(body);
    });

    it('multipart 上传进度走 XHR，并保持 CSRF 与统一响应处理', async () => {
        const session = signIn(7, 'abc');
        const progress = vi.fn();
        const headers: Record<string, string> = {};
        const xhr = {
            upload: { onprogress: null as ((event: ProgressEvent) => void) | null },
            onload: null as (() => void) | null,
            onerror: null as (() => void) | null,
            onabort: null as (() => void) | null,
            status: 200,
            responseText: JSON.stringify({ code: 0, message: 'ok', data: { url: '/system-uploads/image.png' } }),
            withCredentials: false,
            open: vi.fn(),
            setRequestHeader: vi.fn((name: string, value: string) => { headers[name] = value; }),
            getResponseHeader: vi.fn(() => null),
            send: vi.fn(() => {
                xhr.upload.onprogress?.({ lengthComputable: true, loaded: 1, total: 2 } as ProgressEvent);
                xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 2 } as ProgressEvent);
                xhr.onload?.();
            }),
            abort: vi.fn(),
        };
        vi.stubGlobal('XMLHttpRequest', function XMLHttpRequestMock() { return xhr; });
        vi.stubGlobal('fetch', vi.fn());
        const body = new FormData();
        body.append('file', new File(['image'], 'image.png'));

        await expect(http.post('/api-backend/system/media/uploadFile', body, { onUploadProgress: progress })).resolves.toEqual({ url: '/system-uploads/image.png' });
        expect(xhr.open).toHaveBeenCalledWith('POST', '/api-backend/system/media/uploadFile');
        expect(xhr.withCredentials).toBe(true);
        expect(headers['X-CSRF-Token']).toBe(session);
        expect(headers['Content-Type']).toBeUndefined();
        expect(xhr.send).toHaveBeenCalledWith(body);
        expect(progress.mock.calls.map(([percent]) => percent)).toEqual([50, 100]);
        expect(fetch).not.toHaveBeenCalled();
    });

    it.each(['POST', 'DELETE'] as const)('%s 同样带 X-CSRF-Token', async (method) => {
        const session = signIn();
        respond({ code: 0, message: 'ok', data: null });
        await request('/api-backend/x', { method, ...(method === 'POST' ? { body: {} } : {}) });
        const init = vi.mocked(fetch).mock.calls[0]![1];
        expect((init?.headers as Record<string, string>)['X-CSRF-Token']).toBe(session);
    });

    it('GET 不带 X-CSRF-Token，也不带 Authorization', async () => {
        signIn();
        respond({ code: 0, message: 'ok', data: null });
        await http.get('/api-backend/x');
        const init = vi.mocked(fetch).mock.calls[0]![1];
        expect(init?.credentials).toBe('same-origin');
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBeUndefined();
        expect(headers.Authorization).toBeUndefined();
    });

    it('未登录时写请求不带 X-CSRF-Token（如登录接口）', async () => {
        respond({ code: 0, message: 'ok', data: null });
        await http.post('/api-backend/n/system/auth/login', { username: 'a', password: 'b' });
        const init = vi.mocked(fetch).mock.calls[0]![1];
        const headers = init?.headers as Record<string, string>;
        expect(headers['X-CSRF-Token']).toBeUndefined();
        expect(headers.Authorization).toBeUndefined();
    });

    it('100101 清除会话', async () => {
        signIn();
        respond({ code: 100101, message: '登录已失效，请重新登录', data: null }, 401);
        await expect(request('/api-backend/system/auth/getCurrentUser')).rejects.toMatchObject({ code: 100101 });
        expect(getSession()).toBeNull();
    });

    it('HTTP 401 且响应体不是 JSON 也视为会话失效', async () => {
        signIn();
        respond('<html>401</html>', 401);
        await expect(request('/api-backend/x')).rejects.toMatchObject({ code: 100101 });
        expect(getSession()).toBeNull();
    });

    it('110101（密码错误）不清会话', async () => {
        const session = signIn();
        respond({ code: 110101, message: '用户名或密码错误', data: null }, 401);
        await expect(request('/api-backend/system/auth/updatePassword', { method: 'PUT', body: {} })).rejects.toMatchObject({ code: 110101 });
        expect(getSession()).toBe(session);
    });

    it('100103（CSRF 校验失败）按普通业务错误 Toast，不清会话', async () => {
        const session = signIn();
        respond({ code: 100103, message: '请求校验失败，请刷新页面后重试', data: null }, 403);
        await expect(request('/api-backend/system/user/list', { method: 'POST', body: {} })).rejects.toMatchObject({ code: 100103, status: 403 });
        expect(Toast.error).toHaveBeenCalledWith('请求校验失败，请刷新页面后重试');
        expect(getSession()).toBe(session);
    });

    it('网络错误转成 code -1', async () => {
        vi.stubGlobal('fetch', vi.fn(() => Promise.reject(new TypeError('Failed to fetch'))));
        await expect(request('/api-backend/x')).rejects.toMatchObject({ code: -1 });
        expect(Toast.error).toHaveBeenCalledWith('网络请求失败，请检查网络连接');
    });

    describe('requestId', () => {
        const RID = '0123456789abcdef0123456789abcdef';

        it('失败体带 requestId：Toast 含前 8 位，ApiError 带完整值', async () => {
            respond({ code: 100005, message: '服务器内部错误', data: null, requestId: RID }, 500);
            const err = await request('/api-backend/x').catch((e: unknown) => e);
            expect((err as ApiError).requestId).toBe(RID);
            expect(Toast.error).toHaveBeenCalledWith('服务器内部错误（请求号 01234567）');
        });

        it('失败体没有 requestId 时退回响应头 X-Request-Id', async () => {
            respond({ code: 100003, message: '用户名已存在', data: null }, 409, { 'X-Request-Id': RID });
            const err = await request('/api-backend/x').catch((e: unknown) => e);
            expect((err as ApiError).requestId).toBe(RID);
            expect(Toast.error).toHaveBeenCalledWith('用户名已存在（请求号 01234567）');
        });

        it('会话失效分支也带 requestId', async () => {
            respond({ code: 100101, message: '登录已失效，请重新登录', data: null, requestId: RID }, 401);
            await expect(request('/api-backend/x')).rejects.toMatchObject({ code: 100101, requestId: RID });
        });

        it('两处都没有时文案不变，requestId 为空', async () => {
            respond({ code: 100003, message: '用户名已存在', data: null }, 409);
            const err = await request('/api-backend/x').catch((e: unknown) => e);
            expect((err as ApiError).requestId).toBeUndefined();
            expect(Toast.error).toHaveBeenCalledWith('用户名已存在');
        });

        it('成功响应不受影响（带响应头也不 Toast）', async () => {
            respond({ code: 0, message: 'ok', data: { id: 1 } }, 200, { 'X-Request-Id': RID });
            await expect(request('/api-backend/x')).resolves.toEqual({ id: 1 });
            expect(Toast.error).not.toHaveBeenCalled();
        });

        it('silent 时不 Toast，但 ApiError 带 requestId', async () => {
            respond({ code: 100005, message: '服务器内部错误', data: null, requestId: RID }, 500);
            await expect(request('/api-backend/x', { silent: true })).rejects.toMatchObject({ requestId: RID });
            expect(Toast.error).not.toHaveBeenCalled();
        });
    });
});
