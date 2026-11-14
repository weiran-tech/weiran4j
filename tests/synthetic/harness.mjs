import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApiModel } from './model.mjs';
import { withApiSession } from '../support/api/session.mjs';
import { ResourceLedger } from '../support/api/resources.mjs';

/** Native-fetch replacement for offline step tests; no real credentials or services. */
export async function scenario(operation, { writes = true, fault = {}, setup, after } = {}) {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'weiran-api-unit-'));
    const model = createApiModel(); Object.assign(model.fault, fault); setup?.(model);
    const previousFetch = globalThis.fetch;
    const names = ['FLOW_ADMIN_USERNAME', 'FLOW_ADMIN_PASSWORD', 'FLOW_ADMIN_PASSWORD_FILE', 'FLOW_ALLOW_WRITE', 'TEST_SESSION_ROLE'];
    const environment = Object.fromEntries(names.map((name) => [name, process.env[name]]));
    globalThis.fetch = model.fetcher;
    process.env.FLOW_ADMIN_USERNAME = 'api_admin'; process.env.FLOW_ADMIN_PASSWORD = 'synthetic-admin-password';
    process.env.FLOW_ALLOW_WRITE = 'true'; delete process.env.TEST_SESSION_ROLE; delete process.env.FLOW_ADMIN_PASSWORD_FILE;
    try {
        const result = await withApiSession({ root, addresses: { apiBaseURL: 'http://localhost:1', webBaseURL: 'http://localhost:1' }, environment: 'local', writes }, async (api) => {
            const resources = writes ? new ResourceLedger(api) : undefined;
            try { return await operation(api, resources, model); }
            finally { if (resources) await resources.cleanup(); }
        });
        await after?.({ model, root });
        return result;
    } finally {
        globalThis.fetch = previousFetch;
        for (const name of names) { if (environment[name] === undefined) delete process.env[name]; else process.env[name] = environment[name]; }
        fs.rmSync(root, { recursive: true, force: true });
    }
}
