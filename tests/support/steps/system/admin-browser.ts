import path from 'node:path';
import { expect, type Browser, type Page, type BrowserContext } from '@playwright/test';
import { readCredentials, principalFromState, rememberSession, storeSession, checkSession, closeTrackedSession } from '../../../framework/session.mjs';
import { login } from '../auth/login';

type Evidence = (name: string, state?: Record<string, boolean>) => Promise<void>;

export async function checkAdminBrowser(page: Page, browser: Browser, environment: string,
    addresses: { apiBaseURL: string; webBaseURL: string }, evidence: Evidence) {
    const root = path.join(process.cwd(), 'tests'), credentials = readCredentials(root, 'admin');
    let principal: ReturnType<typeof principalFromState> | undefined;
    let second: BrowserContext | undefined;
    try {
        await page.goto('/profile');
        await expect(page).toHaveURL(/\/login\?redirect=/);
        await evidence('before-state', { anonymousRedirected: true });
        await evidence('before-screenshot');
        try { await login(page, credentials); } finally { credentials.password = ''; }
        principal = principalFromState(await page.context().storageState(), addresses);
        rememberSession(root, environment, 'admin', addresses, credentials.username, principal);
        await expect(page).toHaveURL(/\/profile$/);
        await expect(page.getByText('登录时使用的账号名称', { exact: true })).toBeVisible();
        await storeSession(root, environment, 'admin', addresses, credentials.username, principal);
        const verified = await checkSession(root, environment, 'admin', addresses);
        try { second = await browser.newContext({ baseURL: addresses.webBaseURL, storageState: verified.session.storageState }); }
        catch { throw new Error('登录态上下文创建失败（不输出认证材料）'); }
        const reused = await second.newPage();
        await reused.goto('/profile');
        await expect(reused).toHaveURL(/\/profile$/);
        await expect(reused.getByText('登录时使用的账号名称', { exact: true })).toBeVisible();
        await expect(reused.locator('.admin-header__user')).toBeVisible();
        const snapshot = await reused.request.get('/api-backend/system/auth/getAuthorizationSnapshot');
        const body = await snapshot.json();
        expect(snapshot.status()).toBe(200);
        expect(body.code).toBe(0);
        expect(String(body.data?.user?.id)).toBe(principal.id);
        expect(body.data?.user?.username).toBe(credentials.username);
        expect(Array.isArray(body.data?.menus)).toBe(true);
        expect(typeof body.data?.revision).toBe('string');
        await evidence('after-state', { browserLoginSucceeded: true, profileVisible: true, secondContextReused: true, identityVerified: true });
        await evidence('after-screenshot');
    } finally {
        credentials.password = '';
        if (!principal) {
            try { principal = principalFromState(await page.context().storageState(), addresses); } catch { /* No complete reusable Cookie session. */ }
            if (principal) rememberSession(root, environment, 'admin', addresses, credentials.username, principal);
        }
        let sessionClosed = !principal;
        try {
            if (principal) {
                await closeTrackedSession(root, environment, 'admin', addresses, principal);
                sessionClosed = true;
                await page.context().clearCookies();
            }
        } finally {
            await second?.close();
            await evidence('cleanup-state', { sessionClosed, recoveryRequired: !sessionClosed, oldJwtRevocationClaimed: false });
        }
    }
}
