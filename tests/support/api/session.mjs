import path from 'node:path';
import { readCredentials, principalFromState, rememberSession, closeTrackedSession, sessionRequest, checkSession } from '../../framework/session.mjs';
import { ok, requireValue, id } from './protocol.mjs';

function validateScope(scope) {
    let valid = false;
    try {
        const urls = [scope.addresses.apiBaseURL, scope.addresses.webBaseURL].map((value) => new URL(value));
        valid = urls.every((url) => ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && !url.search && !url.hash)
            && urls[0].hostname === urls[1].hostname
            && /^[a-zA-Z0-9_-]+(?:\.local)?$/.test(scope.environment) && /^[a-z][a-z0-9-]*$/.test(scope.role);
    } catch { /* Only fixed diagnostics below. */ }
    requireValue(valid, 'API 会话环境、角色或地址无效；Cookie两地址须同hostname');
}
export function allowWrites() {
    requireValue(process.env.FLOW_ALLOW_WRITE === 'true', '写入测试需要显式 FLOW_ALLOW_WRITE=true');
}
/** @param {any} scope @param {any} principal */
export function client(scope, principal) {
    return {
        scope, principal, identity: null, ownedSession: false, sessionClosed: false, resourcesClosed: true,
        request: (route, method = 'GET', data = undefined) => sessionRequest(scope.addresses.apiBaseURL, route, { principal, method, data }),
        anonymous: (route, method = 'GET', data = undefined) => sessionRequest(scope.addresses.apiBaseURL, route, { method, data }),
    };
}
/** @param {any} scope @param {{username: string, password: string}} credentials @param {any} operation */
export async function withIdentity(scope, credentials, operation) {
    validateScope(scope);
    const jar = { id: '', storageState: { cookies: [], origins: [] } };
    let principal, result, failure, api;
    try {
        const response = await sessionRequest(scope.addresses.apiBaseURL, '/api-backend/n/system/auth/login', { principal: jar, method: 'POST', data: credentials });
        const payload = ok(response);
        requireValue(payload?.mfaRequired !== true, '测试身份不满足专用密码登录前提');
        principal = principalFromState(jar.storageState, scope.addresses);
        rememberSession(scope.root, scope.environment, scope.role, scope.addresses, credentials.username, principal);
        api = client(scope, principal);
        api.ownedSession = true;
        const identity = ok(await api.request('/api-backend/system/auth/getCurrentUser'));
        requireValue(id(identity?.id) === principal.id && identity?.username === credentials.username, 'API 测试身份不一致');
        api.identity = identity;
        result = await operation(api);
    } catch (caught) { failure = caught; }
    finally {
        credentials.password = '';
        // Set-Cookie is applied before JSON parsing. Preserve/clean already-issued cookies on JSON failure.
        if (!principal && jar.storageState.cookies.length) {
            try { principal = principalFromState(jar.storageState, scope.addresses, true); }
            catch { failure = new Error('登录未形成可安全恢复的完整 Cookie'); }
        }
        if (principal) {
            try {
                rememberSession(scope.root, scope.environment, scope.role, scope.addresses, credentials.username, principal);
                await closeTrackedSession(scope.root, scope.environment, scope.role, scope.addresses, principal);
                if (api) api.sessionClosed = true;
            } catch {
                const resourceId = /^[a-f0-9]{24}$/.test(failure?.resourceRunId ?? '') ? `；业务资源恢复 runId=${failure.resourceRunId}` : '';
                failure = new Error((failure ? 'API 断言与会话清理均失败，保留私有恢复材料' : 'API 会话清理失败，保留私有恢复材料') + resourceId);
            }
        }
    }
    if (failure) throw failure;
    return result;
}
/** @param {any} options @param {any} operation */
export async function withApiSession(options, operation) {
    if (options.writes) allowWrites();
    const scope = { root: path.join(process.cwd(), 'tests'), environment: process.env.TEST_FLOW_ENV ?? 'local', role: 'api-admin', ...options };
    validateScope(scope);
    const borrowedRole = options.borrowRole ?? process.env.TEST_SESSION_ROLE;
    if (borrowedRole) {
        const value = await checkSession(scope.root, scope.environment, borrowedRole, scope.addresses);
        const api = client(scope, value.principal);
        api.identity = ok(await api.request('/api-backend/system/auth/getCurrentUser'));
        return operation(api);
    }
    return withIdentity(scope, readCredentials(scope.root, 'admin'), operation);
}
export function permissions(api, required) {
    const values = api.identity?.permissions;
    requireValue(Array.isArray(values) && (values.includes('*') || required.every((code) => values.includes(code))), '测试账号缺少流程要求的权限');
}
