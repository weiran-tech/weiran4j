import { test } from "../../../support/fixtures/test";
import { apiBaseURL, webBaseURL } from "../../../support/helpers/environment";
import { attachState } from "../../../support/helpers/evidence";
import { checkAdminBrowser } from "../../../support/steps/system/admin-browser";

// 登录和登录态含敏感材料，不生成自动 trace/video/失败截图。
test.use({ trace: 'off', video: 'off', screenshot: 'off', storageState: { cookies: [], origins: [] } });

test('admin 页面登录、身份页面、隔离上下文复用及Cookie 清理', async ({ page, browser }, testInfo) => {
    await test.step('真实页面与会话闭环', () => checkAdminBrowser(page, browser, process.env.TEST_FLOW_ENV ?? 'local',
        { apiBaseURL, webBaseURL }, async (name, state) => {
            if (state) await attachState(testInfo, name, state);
            else await testInfo.attach(name, { body: await page.screenshot(), contentType: 'image/png' });
        }));
});
