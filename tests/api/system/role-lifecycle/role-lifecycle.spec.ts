import { test } from '../../../support/fixtures/api';
import { roleLifecycle } from '../../../support/steps/api/identity';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('角色生命周期与授权版本', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('角色生命周期与授权版本', () => roleLifecycle(api, resources));
    await attachState(info, 'after-state', state);
});
