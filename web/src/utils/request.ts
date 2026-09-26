import { Toast } from '@douyinfe/semi-ui';
import { config } from '@/config';
import type { ApiResponse } from '@/types/api';
import { clearToken, getToken } from './token';

/** 契约 §4：未登录 / 令牌失效 */
export const CODE_UNAUTHORIZED = 40100;
/** 契约 §4：用户名或密码错误（HTTP 也是 401，但不代表会话失效，不能踢下线） */
export const CODE_BAD_CREDENTIALS = 40101;

/** 业务错误：统一响应 code !== 0，或网络/解析失败（code 为 -1） */
export class ApiError extends Error {
    readonly code: number;
    readonly status: number;

    constructor(code: number, message: string, status = 0) {
        super(message || `请求失败（code=${code}）`);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    /** 静默：不自动 Toast 错误，由调用方处理 */
    silent?: boolean;
    signal?: AbortSignal;
}

function isApiResponse(v: unknown): v is ApiResponse<unknown> {
    return typeof v === 'object' && v !== null && typeof (v as { code?: unknown }).code === 'number';
}

function fail(err: ApiError, silent: boolean | undefined): never {
    if (!silent) Toast.error(err.message);
    throw err;
}

/**
 * fetch 封装：带 Bearer、解包 `{code, message, data}`。
 * - code === 0（数字）返回 data；
 * - 其它 code 抛 ApiError 并 Toast message；
 * - 会话失效（code 40100，或 HTTP 401 且不是「密码错误」）清令牌，路由守卫随即跳登录页。
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, silent, signal } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;

    let res: Response;
    try {
        res = await fetch(`${config.apiBaseUrl}${url}`, {
            method,
            headers,
            ...(body === undefined ? {} : { body: JSON.stringify(body) }),
            ...(signal ? { signal } : {}),
        });
    } catch (e) {
        if (e instanceof DOMException && e.name === 'AbortError') throw e;
        return fail(new ApiError(-1, '网络请求失败，请检查网络连接'), silent);
    }

    let payload: unknown;
    try {
        payload = await res.json();
    } catch {
        payload = null;
    }

    const code = isApiResponse(payload) ? payload.code : res.ok ? -1 : res.status * 100;
    const sessionExpired =
        code === CODE_UNAUTHORIZED || (res.status === 401 && code !== CODE_BAD_CREDENTIALS);

    if (sessionExpired) {
        // 登录页上本就没有令牌，不必再清
        if (token) clearToken();
        const message = isApiResponse(payload) && payload.message ? payload.message : '登录已失效，请重新登录';
        return fail(new ApiError(CODE_UNAUTHORIZED, message, res.status), silent);
    }

    if (!isApiResponse(payload)) {
        return fail(new ApiError(-1, res.ok ? '响应解析失败' : `请求失败（HTTP ${res.status}）`, res.status), silent);
    }
    if (payload.code !== 0) {
        return fail(new ApiError(payload.code, payload.message || '操作失败', res.status), silent);
    }
    return payload.data as T;
}

export const http = {
    get: <T>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(url, { ...opts, method: 'GET' }),
    post: <T>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(url, { ...opts, method: 'POST', body: body ?? {} }),
    put: <T>(url: string, body?: unknown, opts?: Omit<RequestOptions, 'method' | 'body'>) =>
        request<T>(url, { ...opts, method: 'PUT', body: body ?? {} }),
    delete: <T>(url: string, opts?: Omit<RequestOptions, 'method' | 'body'>) => request<T>(url, { ...opts, method: 'DELETE' }),
};
