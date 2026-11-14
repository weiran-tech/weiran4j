import { test } from '../../../support/fixtures/api';
import { dictLifecycle } from '../../../support/steps/api/platform';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: true, trace: 'off', screenshot: 'off', video: 'off' });
test('字典项排序、启用与级联', async ({ api, resources }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('字典项排序、启用与级联', () => dictLifecycle(api, resources));
    await attachState(info, 'after-state', state);
});
