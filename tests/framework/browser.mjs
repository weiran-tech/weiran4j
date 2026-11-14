import fs from 'node:fs';
import path from 'node:path';
import { readJson, inside, resolveExecution } from './core.mjs';
import { rememberSession, storeSession, closeTrackedSession, sessionRequest, principalFromState } from './session.mjs';
import { workflowError } from './utils.mjs';

export async function loginWindow(root, environment, role, flags = {}, browserType) {
    if (!/^[a-zA-Z0-9_-]+(?:\.local)?$/.test(environment) || !/^[a-z][a-z0-9-]*$/.test(role)) throw workflowError('CONFIG', '环境或角色无效');
    const profile = readJson(inside(root, `envs/${environment}.json`));
    const { environment: addresses, portal } = resolveExecution({ params: [] }, profile, flags);
    if (fs.existsSync(path.join(root, '.local/sessions', environment, `${role}.json`))) throw workflowError('CONFLICT', '已有会话，请先 session clear');
    const timeout = Number(flags['timeout-ms'] ?? 600000);
    if (!Number.isSafeInteger(timeout) || timeout < 1 || timeout > 86400000) throw workflowError('CONFIG', '登录超时无效');
    const chromium = browserType ?? (await import('@playwright/test')).chromium;
    let browser, context, principal, saved = false, cancelling;
    let interrupted = false;
    const readPrincipal = async () => {
        try { return principalFromState(await context.storageState(), addresses); } catch { return null; }
    };
    const cancel = () => {
        interrupted = true;
        cancelling = (async () => {
            principal ??= await readPrincipal();
            if (principal) rememberSession(root, environment, role, addresses, role, principal);
            await context?.close();
        })().catch(() => {});
    };
    process.once('SIGINT', cancel); process.once('SIGTERM', cancel);
    try {
        browser = await chromium.launch({ headless: false, timeout: Math.min(timeout, 30000), ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}) });
        if (interrupted) throw workflowError('INTERRUPTED', '人工登录已取消');
        context = await browser.newContext({ baseURL: addresses.webBaseURL, locale: 'zh-CN', timezoneId: 'Asia/Singapore' });
        if (interrupted) throw workflowError('INTERRUPTED', '人工登录已取消');
        const page = await context.newPage();
        await page.goto(portal.loginPath, { timeout: Math.min(timeout, 30000) });
        await page.waitForURL((url) => url.origin === new URL(addresses.webBaseURL).origin
            && url.pathname.replace(/\/$/, '') === portal.homePath.replace(/\/$/, ''), { timeout });
        principal = await readPrincipal();
        if (!principal) throw workflowError('ENVIRONMENT', '页面未返回可核验的 Cookie 会话');
        rememberSession(root, environment, role, addresses, role, principal);
        const identity = await sessionRequest(addresses.apiBaseURL, '/api-backend/system/auth/getCurrentUser', { principal });
        if (identity.status !== 200 || identity.payload?.code !== 0 || String(identity.payload.data?.id) !== principal.id || typeof identity.payload.data?.username !== 'string') {
            throw workflowError('ENVIRONMENT', '人工登录后的远端身份核验失败');
        }
        await storeSession(root, environment, role, addresses, identity.payload.data.username, principal);
        saved = true;
        return { environment, role, portal: portal.name, saved: true };
    } catch (error) {
        await cancelling;
        const initial = ['CONFIG', 'ENVIRONMENT', 'CONFLICT', 'CLEANUP', 'INTERRUPTED'].includes(error.code) ? error
            : workflowError(interrupted ? 'INTERRUPTED' : 'ENVIRONMENT', interrupted ? '人工登录已取消' : '人工登录未完成或浏览器启动失败（不输出认证材料）');
        principal ??= await readPrincipal();
        if (principal && !saved) {
            try {
                rememberSession(root, environment, role, addresses, role, principal);
                await closeTrackedSession(root, environment, role, addresses, principal);
            } catch (cleanup) {
                cleanup.failures = [{ kind: initial.code, message: initial.message }, { kind: cleanup.code ?? 'CLEANUP', message: cleanup.message }];
                throw cleanup;
            }
        }
        throw initial;
    } finally {
        process.removeListener('SIGINT', cancel); process.removeListener('SIGTERM', cancel);
        try { await context?.close(); } catch { /* browser.close continues cleanup. */ }
        try { await browser?.close(); } catch { /* Never emit raw browser authentication logs. */ }
    }
}
