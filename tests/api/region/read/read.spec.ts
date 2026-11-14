import { test } from '../../../support/fixtures/api';
import { readRegions } from '../../../support/steps/api/read';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: false, trace: 'off', screenshot: 'off', video: 'off' });
test('地区公开与后台只读契约', async ({ api }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('地区公开与后台只读契约', () => readRegions(api));
    await attachState(info, 'after-state', state);
});
