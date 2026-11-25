import { Toast } from '@douyinfe/semi-ui';
import { mockFetch } from '@/mocks/transport';
import type { ApiResponse } from '@/types/api';
import { clearSession, getSession } from './session';

/** 契约 §4：未登录 / 会话失效 */
export const CODE_UNAUTHORIZED = 100101;
/** 契约 §4：用户名或密码错误（HTTP 也是 401，但不代表会话失效，不能踢下线） */
export const CODE_BAD_CREDENTIALS = 110101;
/**
 * 契约 §4：CSRF 校验失败（HTTP 403）。按普通业务错误 Toast，**不清会话**——
 * 令牌本身仍有效，多半是 `prototype_csrf` 被别的标签页换掉或代理剥掉了请求头，刷新页面即可恢复。
 */
export const CODE_CSRF_REJECTED = 100103;
/** 写请求必须带的 CSRF 头（值 = `prototype_csrf` Cookie） */
export const CSRF_HEADER = 'X-CSRF-Token';

/** 业务错误：统一响应 code !== 0，或网络/解析失败（code 为 -1） */
export class ApiError extends Error {
    readonly code: number;
    readonly status: number;
    /** 契约 §4：服务端请求号（失败体 `requestId`，缺失时取响应头 `X-Request-Id`）；网络错误没有 */
    readonly requestId?: string;

    constructor(code: number, message: string, status = 0, requestId?: string) {
        super(message || `请求失败（code=${code}）`);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
        if (requestId) this.requestId = requestId;
    }
}

export interface RequestOptions {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: unknown;
    /** 静默：不自动 Toast 错误，由调用方处理 */
    silent?: boolean;
    signal?: AbortSignal;
    /** 文件请求的发送进度；仅 FormData 上传时触发，值为 0–100。 */
    onUploadProgress?: (percent: number) => void;
}

function isApiResponse(v: unknown): v is ApiResponse<unknown> {
    return typeof v === 'object' && v !== null && typeof (v as { code?: unknown }).code === 'number';
}

/** 失败体 `requestId` 优先，其次响应头 `X-Request-Id`；都没有返回 undefined */
function pickRequestId(payload: unknown, res: Response): string | undefined {
    const fromBody = (payload as { requestId?: unknown } | null)?.requestId;
    if (typeof fromBody === 'string' && fromBody) return fromBody;
    return res.headers?.get('X-Request-Id') || undefined;
}

function fail(err: ApiError, silent: boolean | undefined): never {
    const { requestId } = err;
    if (requestId) console.warn(`[request] code=${err.code} requestId=${requestId}`);
    if (!silent) Toast.error(requestId ? `${err.message}（请求号 ${requestId.slice(0, 8)}）` : err.message);
    throw err;
}

/** 原型数据请求：统一解包数字 code，保留页面错误、会话和进度回调契约。 */
export async function request<T>(url: string, options: RequestOptions = {}): Promise<T> {
    const { method = 'GET', body, silent, signal, onUploadProgress } = options;
    const headers: Record<string, string> = { Accept: 'application/json' };
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    if (body !== undefined && !isFormData) headers['Content-Type'] = 'application/json';
    // 请求发出时的会话；失效分支据此判断要不要清（登录页上本就没有会话）
    const session = getSession();
    if (method !== 'GET' && session) headers[CSRF_HEADER] = session;

    let res: Response;
    try {
        signal?.throwIfAborted();
        res = await mockFetch(url, {
            method, headers, credentials: 'same-origin',
            ...(body === undefined ? {} : { body: isFormData ? body : JSON.stringify(body) }),
            ...(signal ? { signal } : {}),
        });
        if (onUploadProgress && isFormData) onUploadProgress(100);
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
    const requestId = pickRequestId(payload, res);

    const code = isApiResponse(payload) ? payload.code : -1;
    const sessionExpired =
        code === CODE_UNAUTHORIZED || (res.status === 401 && code !== CODE_BAD_CREDENTIALS);

    if (sessionExpired) {
        // 登录页上本就没有会话，不必再清
        if (session) clearSession();
        const message = isApiResponse(payload) && payload.message ? payload.message : '登录已失效，请重新登录';
        return fail(new ApiError(CODE_UNAUTHORIZED, message, res.status, requestId), silent);
    }

    if (!isApiResponse(payload)) {
        return fail(new ApiError(-1, res.ok ? '响应解析失败' : `请求失败（HTTP ${res.status}）`, res.status, requestId), silent);
    }
    if (payload.code !== 0) {
        return fail(new ApiError(payload.code, payload.message || '操作失败', res.status, requestId), silent);
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
