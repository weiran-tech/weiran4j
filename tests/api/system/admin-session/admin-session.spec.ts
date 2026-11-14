import { test } from "../../../support/fixtures/test";
import { apiBaseURL } from "../../../support/helpers/environment";
import { attachState } from "../../../support/helpers/evidence";
import { checkAdminSession } from "../../../support/steps/system/admin-session";

test.use({ trace: 'off', screenshot: 'off', video: 'off' });

test('本地 admin 登录、身份授权、CSRF 与 Cookie 清理闭环', async ({}, testInfo) => {
    await test.step('管理端 Cookie 会话及授权契约', () => checkAdminSession(apiBaseURL,
        (name, state) => attachState(testInfo, name, state)));
});
