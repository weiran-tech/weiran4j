import path from 'node:path';
import { test as base, type TestInfo } from '@playwright/test';
import { withApiSession } from '../api/session.mjs';
import { ResourceLedger } from '../api/resources.mjs';
import { apiBaseURL, webBaseURL } from '../helpers/environment';
import { attachState } from '../helpers/evidence';

export const test = base.extend<{ api: any; resources: ResourceLedger; writes: boolean }>({
    writes: [false, { option: true }],
    api: async ({ writes }: { writes: boolean }, use: (value: any) => Promise<void>, info: TestInfo) => {
        let observed: any;
        try {
            await withApiSession({ writes, root: path.join(process.cwd(), 'tests'),
                addresses: { apiBaseURL, webBaseURL }, environment: process.env.TEST_FLOW_ENV ?? 'local' }, async (api: any) => {
                observed = api;
                await attachState(info, 'before-state', { identityVerified: true, writesAllowed: writes, businessState: 'untouched' });
                await use(api);
            });
        } finally {
            await attachState(info, 'cleanup-state', { ownedSessionClosed: observed?.ownedSession === true && observed?.sessionClosed === true,
                borrowedSessionPreserved: observed?.ownedSession === false, resourcesClosed: observed?.resourcesClosed !== false,
                oldJwtRevocationClaimed: false });
        }
    },
    resources: async ({ api, writes }, use) => {
        if (!writes) throw new Error('业务资源 fixture 必须声明 writes=true');
        const resources = new ResourceLedger(api);
        api.resourcesClosed = false;
        try { await use(resources); }
        finally { await resources.cleanup(); api.resourcesClosed = true; }
    },
});
// API authentication and business bodies never enter automatic browser artifacts.
test.use({ trace: 'off', screenshot: 'off', video: 'off' });
export { expect } from '@playwright/test';
