import path from 'node:path';
import { readCredentials, principalFromState, rememberSession, closeTrackedSession, sessionRequest } from '../../../framework/session.mjs';

type Evidence = (name: 'before-state' | 'after-state' | 'cleanup-state', state: Record<string, boolean | string>) => Promise<void>;
const ensure: (value: unknown, message: string) => asserts value = (value, message) => { if (!value) throw new Error(message); };

export async function checkAdminSession(baseURL: string, evidence: Evidence, root = path.join(process.cwd(), 'tests')) {
    const addresses = { apiBaseURL: baseURL, webBaseURL: process.env.TEST_WEB_BASE_URL ?? 'http://localhost:5202' };
    const credentials = readCredentials(root, 'admin');
    const jar = { id: '', storageState: { cookies: [] as Array<unknown>, origins: [] } };
    let principal: ReturnType<typeof principalFromState> | undefined;
    try {
        const anonymous = await sessionRequest(baseURL, '/api-backend/system/auth/getCurrentUser');
        ensure(anonymous.status === 401 && anonymous.payload?.code === 100101, '登录前匿名访问未被拒绝');
        await evidence('before-state', { anonymousRejected: true, username: credentials.username });
        const login = await sessionRequest(baseURL, '/api-backend/n/system/auth/login', { principal: jar, method: 'POST', data: credentials });
        credentials.password = '';
        principal = principalFromState(jar.storageState, addresses);
        rememberSession(root, process.env.TEST_FLOW_ENV ?? 'local', 'admin', addresses, credentials.username, principal);
        ensure(login.status === 200 && login.payload?.code === 0 && login.payload.data?.mfaRequired !== true, '密码登录失败或需要二次验证');
        const profile = await sessionRequest(baseURL, '/api-backend/system/auth/getCurrentUser', { principal });
        ensure(profile.status === 200 && profile.payload?.code === 0 && profile.payload.data?.username === credentials.username
            && String(profile.payload.data?.id) === principal.id, '已登录主体不一致');
        const snapshot = await sessionRequest(baseURL, '/api-backend/system/auth/getAuthorizationSnapshot', { principal });
        ensure(snapshot.status === 200 && snapshot.payload?.code === 0 && String(snapshot.payload.data?.user?.id) === principal.id
            && snapshot.payload.data.user.username === credentials.username && Array.isArray(snapshot.payload.data.user.permissions)
            && Array.isArray(snapshot.payload.data.menus) && typeof snapshot.payload.data.revision === 'string', '授权快照契约无效');
        const csrf = await sessionRequest(baseURL, '/api-backend/system/auth/logout', { principal, method: 'POST', csrf: false });
        ensure(csrf.status === 403 && csrf.payload?.code === 100103, '缺少 CSRF 的写请求未被拒绝');
        await evidence('after-state', { identityMatches: true, snapshotMatches: true, csrfRejected: true, cookieAuthenticated: true });
    } finally {
        credentials.password = '';
        // A response can set valid cookies before its JSON body fails to parse.
        if (!principal && jar.storageState.cookies.length > 0) {
            principal = principalFromState(jar.storageState, addresses, true);
            rememberSession(root, process.env.TEST_FLOW_ENV ?? 'local', 'admin', addresses, credentials.username, principal);
        }
        let sessionClosed = !principal;
        try {
            if (principal) {
                await closeTrackedSession(root, process.env.TEST_FLOW_ENV ?? 'local', 'admin', addresses, principal);
                sessionClosed = true;
            }
        } finally {
            await evidence('cleanup-state', { sessionClosed, recoveryRequired: !sessionClosed, oldJwtRevocationClaimed: false });
        }
    }
}
