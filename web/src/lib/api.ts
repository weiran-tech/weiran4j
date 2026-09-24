/** 后端统一响应包络。由 wuli3 的 `ApiResponseBodyAdvice` 产生。 */
export interface ApiResponse<T> {
    /**
     * 业务码。
     *
     * ⚠️ **是字符串不是数字**：成功为 `'0'`，失败形如 `'WEIRAN.SYSTEM.BAD_CREDENTIALS'`。
     * 这与 mono4ts 那套后端（数字 code，`res.code !== 0`）不同 ——
     * 从那边搬代码过来时，`code !== 0` 会因为 `'0' !== 0` 恒为真而把每个成功响应判成失败。
     */
    code: string;
    message: string;
    timestamp: number;
    requestId: string | null;
    data: T;
}

/** 成功业务码。 */
export const SUCCESS_CODE = '0';

/** 令牌在 localStorage 中的键名。 */
export const TOKEN_KEY = 'weiran_token';

/** 业务错误：HTTP 通了但业务码非 0。 */
export class ApiError extends Error {
    readonly code: string;
    readonly status: number;

    constructor(code: string, message: string, status: number) {
        super(message || `请求失败（code=${code}）`);
        this.name = 'ApiError';
        this.code = code;
        this.status = status;
    }
}

/** 网络层错误：请求没能拿到结构化响应。 */
export class NetworkError extends Error {
    constructor(cause: unknown) {
        super('网络异常，请稍后重试');
        this.name = 'NetworkError';
        this.cause = cause;
    }
}

function authHeaders(hasBody: boolean): Record<string, string> {
    const headers: Record<string, string> = {};
    if (hasBody) {
        headers['Content-Type'] = 'application/json';
    }
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

/**
 * 发起请求并解包统一响应。
 *
 * 401 一律清除本地令牌：后端对「过期」「密码已改」「伪造」都返回 401，
 * 它们对前端的处置是同一个 —— 回登录页。具体原因在 `code` 里，供提示文案区分。
 */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    let response: Response;
    try {
        response = await fetch(path, {
            ...init,
            headers: { ...authHeaders(init.body !== undefined), ...init.headers },
        });
    } catch (cause) {
        throw new NetworkError(cause);
    }

    if (response.status === 401) {
        localStorage.removeItem(TOKEN_KEY);
    }

    let body: ApiResponse<T>;
    try {
        body = (await response.json()) as ApiResponse<T>;
    } catch (cause) {
        throw new NetworkError(cause);
    }

    if (body.code !== SUCCESS_CODE) {
        throw new ApiError(body.code, body.message, response.status);
    }
    return body.data;
}

/** GET 请求。 */
export function get<T>(path: string): Promise<T> {
    return request<T>(path, { method: 'GET' });
}

/** POST JSON 请求。 */
export function post<T>(path: string, payload: unknown): Promise<T> {
    return request<T>(path, { method: 'POST', body: JSON.stringify(payload) });
}
