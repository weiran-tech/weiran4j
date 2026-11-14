import { test } from '../../../support/fixtures/api';
import { menuLifecycle } from '../../../support/steps/api/identity';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('菜单树生命周期与防环', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('菜单树生命周期与防环', () => menuLifecycle(api, resources));
    await attachState(info, 'after-state', state);
});
