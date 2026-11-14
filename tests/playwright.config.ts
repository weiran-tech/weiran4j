import { defineConfig, devices } from '@playwright/test';
import { join, resolve } from 'node:path';
import { apiBaseURL, webBaseURL } from './support/helpers/environment';

const artifacts = process.env.TEST_FLOW_ARTIFACT_DIR || resolve('tests/.artifacts/playwright');
const sensitive = Boolean(process.env.TEST_SESSION_ROLE);
// 用例发现无需业务环境；执行必须经统一入口生成批次摘要与严格复核。
if (!process.argv.includes('--list') && !process.env.TEST_FLOW_ARTIFACT_DIR) {
    throw new Error('请使用 pnpm test:flows run 或根 test:api/test:e2e/test:integration，原生 Playwright 仅用于 --list 发现');
}

export default defineConfig({
    testDir: '.',
    outputDir: join(artifacts, 'results'),
    fullyParallel: true,
    forbidOnly: Boolean(process.env.CI),
    // 默认不重试，避免未来的写入场景因失败自动重复执行。
    retries: 0,
    workers: 2,
    timeout: 30_000,
    expect: { timeout: 10_000 },
    reporter: [
        ['list'],
        ['html', { outputFolder: join(artifacts, 'report'), open: 'never' }],
        ['json', { outputFile: join(artifacts, 'results.json') }],
    ],
    use: {
        trace: sensitive ? 'off' : 'retain-on-failure',
        screenshot: sensitive ? 'off' : 'only-on-failure',
        locale: 'zh-CN',
        timezoneId: 'Asia/Singapore',
        ...(process.env.TEST_BROWSER_CHANNEL ? { channel: process.env.TEST_BROWSER_CHANNEL } : {}),
    },
    projects: [
        { name: 'api', testDir: './api', use: { baseURL: apiBaseURL } },
        {
            name: 'e2e',
            testDir: './e2e',
            use: { ...devices['Desktop Chrome'], baseURL: webBaseURL },
        },
    ],
});
