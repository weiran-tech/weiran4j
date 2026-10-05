import { Toast } from '@douyinfe/semi-ui';
import { config } from '@/config';
import type { ApiResponse } from '@/types/api';
import { clearSession, getSession } from './session';

/** 契约 §4：未登录 / 会话失效 */
export const CODE_UNAUTHORIZED = 40100;
/** 契约 §4：用户名或密码错误（HTTP 也是 401，但不代表会话失效，不能踢下线） */
export const CODE_BAD_CREDENTIALS = 40101;
/**
 * 契约 §4：CSRF 校验失败（HTTP 403）。按普通业务错误 Toast，**不清会话**——
 * 令牌本身仍有效，多半是 `weiran_csrf` 被别的标签页换掉或代理剥掉了请求头，刷新页面即可恢复。
 */
export const CODE_CSRF_REJECTED = 40302;
/** 写请求必须带的 CSRF 头（值 = `weiran_csrf` Cookie） */
export const CSRF_HEADER = 'X-CSRF-Token';

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
 * fetch 封装：Cookie 认证 + 双提交 CSRF，解包 `{code, message, data}`（契约 §4）。
 * - 令牌在 HttpOnly 令牌 Cookie 里由浏览器自动携带（`credentials: 'same-origin'`，前后端必须同源）；
 *   不再发 Bearer 认证头；
 * - 非 GET 请求在有会话时带 `X-CSRF-Token: <weiran_csrf>`；
 * - code === 0（数字）返回 data；
 * - 其它 code 抛 ApiError 并 Toast message（含 40302 CSRF 校验失败，不清会话）；
 * - 会话失效（code 40100，或 HTTP 401 且不是「密码错误」）清会话，路由守卫随即跳登录页。
 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, silent, signal } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';
    // 请求发出时的会话；失效分支据此判断要不要清（登录页上本就没有会话）
    const session = getSession();
    if (method !== 'GET' && session) headers[CSRF_HEADER] = session;

    let res: Response;
    try {
        res = await fetch(`${config.apiBaseUrl}${url}`, {
            method,
            headers,
            credentials: 'same-origin',
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
        // 登录页上本就没有会话，不必再清
        if (session) clearSession();
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
