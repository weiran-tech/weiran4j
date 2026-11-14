import { expect, type Page } from '@playwright/test';

export async function openLoginEntry(page: Page) {
    await page.goto('/profile');
    await expect(page).toHaveURL(/\/login\?redirect=/);
    await expect(page.getByPlaceholder('请输入用户名', { exact: true })).toBeVisible();
    await expect(page.getByPlaceholder('请输入密码', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: '登录', exact: true })).toBeVisible();
    // 通过页面同源地址检查真实 Vite 代理；不依赖旧项目的登录提供方接口。
    const response = await page.request.get('/api-backend/system/auth/getCurrentUser');
    const body = await response.json();
    expect(response.status()).toBe(401);
    expect(body.code).toBe(100101);
    return { httpStatus: response.status(), code: body.code, loginPath: new URL(page.url()).pathname, visibleEntry: 'password-form' };
}
