import { test } from '../../../support/fixtures/api';
import { permissionBoundary } from '../../../support/steps/api/permissions';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('隔离账号的允许、拒绝与撤权', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('隔离账号的允许、拒绝与撤权', () => permissionBoundary(api, resources));
    await attachState(info, 'after-state', state);
});
