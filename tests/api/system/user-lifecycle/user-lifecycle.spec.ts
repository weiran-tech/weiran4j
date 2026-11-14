import { test } from '../../../support/fixtures/api';
import { userLifecycle } from '../../../support/steps/api/identity';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('用户生命周期与编辑冲突', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('用户生命周期与编辑冲突', () => userLifecycle(api, resources));
    await attachState(info, 'after-state', state);
});
