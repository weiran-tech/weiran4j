import { test, expect } from "../../../support/fixtures/test";
import { openLoginEntry } from "../../../support/steps/system/login-entry";
import { attachState } from "../../../support/helpers/evidence";

test('未登录后台路由跳转登录页，前端代理保持后端鉴权响应', async ({ page }, testInfo) => {
    const state = await test.step('打开登录页并核对可用入口', () => openLoginEntry(page));
    await attachState(testInfo, 'login-state', state);
    await testInfo.attach('login-screenshot', { body: await page.screenshot(), contentType: 'image/png' });
    expect(state.httpStatus).toBe(401);
    expect(state.code).toBe(100101);
});
