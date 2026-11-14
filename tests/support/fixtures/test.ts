import { test as base, expect, type APIRequestContext } from '@playwright/test';
import { apiBaseURL, webBaseURL } from '../helpers/environment';
import path from 'node:path';
import { checkSession } from '../../framework/session.mjs';

// Anonymous API contexts never inherit the browser's cached authentication.
export const test = base.extend<{ backend: APIRequestContext }>({
    storageState: async ({}, use) => {
        const role = process.env.TEST_SESSION_ROLE;
        if (!role) { await use(undefined); return; }
        const value = await checkSession(path.join(process.cwd(), 'tests'), process.env.TEST_FLOW_ENV ?? 'local', role, { apiBaseURL, webBaseURL });
        await use(value.session.storageState);
    },
    backend: async ({ playwright }, use) => {
        const backend = await playwright.request.newContext({ baseURL: apiBaseURL, storageState: { cookies: [], origins: [] } });
        try { await use(backend); } finally { await backend.dispose(); }
    },
});
export { expect };
export type * from '@playwright/test';
