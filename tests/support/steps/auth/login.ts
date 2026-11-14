import { expect, type Page } from '@playwright/test';

/** 密码仅用于本次表单操作；调用方负责登记主体、核验与退出。 */
export async function login(page: Page, { username, password }: { username: string; password: string }) {
    await page.goto(process.env.FLOW_LOGIN_PATH ?? '/login');
    try {
        await page.getByPlaceholder('请输入用户名', { exact: true }).fill(username);
        await page.getByPlaceholder('请输入密码', { exact: true }).fill(password);
        await page.getByRole('button', { name: '登录', exact: true }).click();
    } catch { throw new Error('业务页面登录失败（不输出密码操作的原始调用日志）'); }
    await page.waitForURL((url) => !url.pathname.startsWith(process.env.FLOW_LOGIN_PATH ?? '/login'));
    await expect(page.locator('.admin-header__user')).toBeVisible();
}
