import { test } from '../../../support/fixtures/api';
import { configLifecycle } from '../../../support/steps/api/platform';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('配置分组生命周期与公开边界', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('配置分组生命周期与公开边界', () => configLifecycle(api, resources));
    await attachState(info, 'after-state', state);
});
