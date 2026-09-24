import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError, NetworkError, SUCCESS_CODE, TOKEN_KEY, get, post } from '../api';
import { hasPermission } from '../auth';
import type { CurrentAccount } from '../auth';

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
    });
}

describe('统一响应解包', () => {
    beforeEach(() => {
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('成功码是字符串 "0" 而不是数字 0', async () => {
        // 这条用例守的是从 mono4ts 搬代码时最容易踩的坑：那边后端返回数字 code，
        // 判定写作 `code !== 0`；直接搬过来会因为 '0' !== 0 恒真而把每个成功响应判成失败。
        expect(SUCCESS_CODE).toBe('0');

        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse({ code: '0', message: '', timestamp: 1, requestId: null, data: { id: 7 } }),
            ),
        );

        await expect(get<{ id: number }>('/api/v1/demo')).resolves.toEqual({ id: 7 });
    });

    it('业务码非 0 时抛 ApiError 并带上原始错误码', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse(
                    {
                        code: 'WEIRAN.SYSTEM.BAD_CREDENTIALS',
                        message: '通行证或密码不正确',
                        timestamp: 1,
                        requestId: null,
                        data: null,
                    },
                    401,
                ),
            ),
        );

        await expect(post('/api/v1/auth/login', {})).rejects.toMatchObject({
            name: 'ApiError',
            code: 'WEIRAN.SYSTEM.BAD_CREDENTIALS',
            status: 401,
        });
    });

    it('401 会清除本地令牌', async () => {
        localStorage.setItem(TOKEN_KEY, 'stale-token');
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue(
                jsonResponse(
                    { code: 'WEIRAN.SYSTEM.TOKEN_EXPIRED', message: '登录已过期', timestamp: 1, requestId: null, data: null },
                    401,
                ),
            ),
        );

        await expect(get('/api/v1/auth/me')).rejects.toBeInstanceOf(ApiError);
        expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it('有令牌时自动注入 Authorization 头', async () => {
        localStorage.setItem(TOKEN_KEY, 'live-token');
        const fetchMock = vi
            .fn()
            .mockResolvedValue(jsonResponse({ code: '0', message: '', timestamp: 1, requestId: null, data: null }));
        vi.stubGlobal('fetch', fetchMock);

        await get('/api/v1/auth/me');

        const headers = (fetchMock.mock.calls[0]?.[1] as RequestInit).headers as Record<string, string>;
        expect(headers['Authorization']).toBe('Bearer live-token');
    });

    it('网络异常抛 NetworkError，与业务失败区分开', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));

        await expect(get('/api/v1/auth/me')).rejects.toBeInstanceOf(NetworkError);
    });
});

describe('前端权限判定', () => {
    const account: CurrentAccount = {
        accountId: 1,
        displayName: 'zhangsan',
        accountType: 'backend',
        roles: ['editor'],
        permissions: ['weiran-system:account.index'],
    };

    it('持有权限点通过，缺少则不通过', () => {
        expect(hasPermission(account, 'weiran-system:account.index')).toBe(true);
        expect(hasPermission(account, 'weiran-system:account.destroy')).toBe(false);
    });

    it('super 角色短路全部判定，与后端 PermissionChecker 同规则', () => {
        expect(hasPermission({ ...account, roles: ['super'], permissions: [] }, 'anything')).toBe(true);
    });

    it('未登录一律不通过', () => {
        expect(hasPermission(null, 'weiran-system:account.index')).toBe(false);
    });
});
