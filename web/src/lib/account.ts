import { get, post } from './api';
import type { PageResult } from './role';

/** 账号视图，字段与后端 `AccountView` record 对齐。 */
export interface AccountView {
    id: number;
    username: string;
    mobile: string | null;
    email: string | null;
    accountType: string;
    enabled: boolean;
}

/** 登录日志视图，字段与后端 `LoginLogView` record 对齐。 */
export interface LoginLogView {
    loginedAt: string | null;
    loginIp: string | null;
}

export interface AccountQuery {
    page: number;
    size: number;
    keyword?: string;
    accountType?: string;
}

export interface CreateAccountPayload {
    username: string;
    password: string;
    mobile?: string | undefined;
    email?: string | undefined;
    accountType: string;
}

export interface UpdateAccountPayload {
    mobile?: string | undefined;
    email?: string | undefined;
}

function buildQueryString(params: object): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            search.set(key, String(value as string | number | boolean));
        }
    }
    const query = search.toString();
    return query ? `?${query}` : '';
}

/** 分页查询账号列表，支持用户名/手机号/邮箱模糊匹配与账号类型筛选。 */
export function listAccounts(query: AccountQuery): Promise<PageResult<AccountView>> {
    return get<PageResult<AccountView>>(`/api/v1/accounts${buildQueryString(query)}`);
}

/** 查账号详情。 */
export function fetchAccountDetail(id: number): Promise<AccountView> {
    return get<AccountView>(`/api/v1/accounts/${id}`);
}

/** 新增账号。 */
export function createAccount(payload: CreateAccountPayload): Promise<AccountView> {
    return post<AccountView>('/api/v1/accounts', payload);
}

/** 编辑账号可变资料字段（不含密码）。 */
export function updateAccount(id: number, payload: UpdateAccountPayload): Promise<AccountView> {
    return post<AccountView>(`/api/v1/accounts/${id}/update`, payload);
}

/** 启用账号。 */
export function enableAccount(id: number): Promise<void> {
    return post<void>(`/api/v1/accounts/${id}/enable`, {});
}

/** 禁用账号，禁用后现有登录接口拒绝该账号登录。 */
export function disableAccount(id: number): Promise<void> {
    return post<void>(`/api/v1/accounts/${id}/disable`, {});
}

/** 重置密码。 */
export function resetAccountPassword(id: number, newPassword: string): Promise<void> {
    return post<void>(`/api/v1/accounts/${id}/reset-password`, { newPassword });
}

/** 查登录日志（复用 `pam_account.logined_at`/`login_ip`，结果至多一条）。 */
export function fetchLoginLogs(id: number): Promise<PageResult<LoginLogView>> {
    return get<PageResult<LoginLogView>>(`/api/v1/accounts/${id}/login-logs`);
}
