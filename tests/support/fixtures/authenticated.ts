import path from 'node:path';
import { test as base, expect } from './test';
import { apiBaseURL, webBaseURL } from '../helpers/environment';
import { attachState } from '../helpers/evidence';
import { login } from '../steps/auth/login';
import { readCredentials, principalFromState, rememberSession, closeTrackedSession, sessionRequest, checkSession } from '../../framework/session.mjs';

export const test = base.extend<{ loginAs: (role?: 'admin' | 'viewer' | 'noperm') => Promise<void> }>({
    loginAs: async ({ page }, use, info) => {
        const root = path.join(process.cwd(), 'tests'), environment = process.env.TEST_FLOW_ENV ?? 'local';
        const addresses = { apiBaseURL, webBaseURL };
        let role = 'admin', owned: ReturnType<typeof principalFromState> | undefined, attempted = false, reused = false;
        try {
            await use(async (selected = 'admin') => {
                if (attempted) throw new Error('每个业务用例只登录一次，角色隔离使用独立用例');
                attempted = true; role = selected;
                if (process.env.TEST_SESSION_ROLE) {
                    if (process.env.TEST_SESSION_ROLE !== role) throw new Error('复用缓存角色与业务用例不一致');
                    await checkSession(root, environment, role, addresses);
                    reused = true;
                    await page.goto(process.env.FLOW_HOME_PATH ?? '/profile');
                    await expect(page.locator('.admin-header__user')).toBeVisible();
                    return;
                }
                const credentials = readCredentials(root, role);
                try { await login(page, credentials); }
                finally {
                    credentials.password = '';
                    try { owned = principalFromState(await page.context().storageState(), addresses); } catch { /* Login did not produce a full session. */ }
                    if (owned) rememberSession(root, environment, role, addresses, credentials.username, owned);
                }
                if (!owned) throw new Error('业务登录缺少有效 Cookie 会话');
                const identity = await sessionRequest(apiBaseURL, '/api-backend/system/auth/getCurrentUser', { principal: owned });
                if (identity.status !== 200 || identity.payload?.code !== 0 || String(identity.payload.data?.id) !== owned.id
                    || identity.payload.data?.username !== credentials.username) throw new Error('业务登录的远端身份不一致');
            });
        } finally {
            let sessionClosed = !owned;
            try {
                if (owned) {
                    await closeTrackedSession(root, environment, role, addresses, owned);
                    await page.context().clearCookies();
                    sessionClosed = true;
                }
            } finally { await attachState(info, 'session-cleanup', { ownedSessionClosed: sessionClosed, reusedExternalSession: reused, oldJwtRevocationClaimed: false }); }
        }
    },
});
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
export { expect };
