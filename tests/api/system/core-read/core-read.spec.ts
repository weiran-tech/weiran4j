import { test } from '../../../support/fixtures/api';
import { readCore } from '../../../support/steps/api/read';
import { attachState } from '../../../support/helpers/evidence';

test.use({ writes: false, trace: 'off', screenshot: 'off', video: 'off' });
test('核心后台读取契约', async ({ api }, info) => {
    test.setTimeout(120_000);
    const state = await test.step('核心后台读取契约', () => readCore(api));
    await attachState(info, 'after-state', state);
});
