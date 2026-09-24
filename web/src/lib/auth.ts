import { get, post, TOKEN_KEY } from './api';

/** 登录接口返回。字段与后端 `LoginResult` record 对齐。 */
export interface LoginResult {
    token: string;
    expiresInSeconds: number;
    accountType: string;
}

/** 当前账号视图。字段与后端 `CurrentAccountView` record 对齐。 */
export interface CurrentAccount {
    accountId: number;
    displayName: string;
    accountType: string;
    roles: string[];
    permissions: string[];
}

/** 登录空间：前台用户 / 后台管理员，与 `pam_account.type` 同域。 */
export type Guard = 'user' | 'backend';

/** 超级管理员角色，持有它视为拥有全部权限。判定规则与后端 `PermissionChecker` 一致。 */
export const SUPER_ROLE = 'super';

/** 用通行证与密码登录，成功后写入本地令牌。 */
export async function login(
    passport: string,
    password: string,
    guard: Guard = 'user',
): Promise<LoginResult> {
    const result = await post<LoginResult>('/api/v1/auth/login', { passport, password, guard });
    localStorage.setItem(TOKEN_KEY, result.token);
    return result;
}

/** 取当前登录账号及其角色、权限。 */
export function fetchCurrentAccount(): Promise<CurrentAccount> {
    return get<CurrentAccount>('/api/v1/auth/me');
}

/** 清除本地令牌。 */
export function logout(): void {
    localStorage.removeItem(TOKEN_KEY);
}

/** 本地是否存在令牌。仅用于决定要不要发 `/me`，不作为已登录的凭据。 */
export function hasToken(): boolean {
    return localStorage.getItem(TOKEN_KEY) !== null;
}

/**
 * 判断当前账号是否拥有指定权限。
 *
 * 与后端 `PermissionChecker.has` 同规则：持有 super 角色即短路通过。
 * 两处必须同规则，否则会出现「前端显示了按钮，点下去被后端拒绝」这类不一致。
 * 前端判定只用于隐藏入口，真正的拦截始终在后端。
 */
export function hasPermission(account: CurrentAccount | null, required: string): boolean {
    if (!account) {
        return false;
    }
    if (account.roles.includes(SUPER_ROLE)) {
        return true;
    }
    return account.permissions.includes(required);
}
