import type { BrowserContext, Page, TestInfo } from '@playwright/test';

export type ParallelScenario = {
    name: string;
    run: (page: Page, attach: (name: string, options: Parameters<TestInfo['attach']>[1]) => Promise<void>) => Promise<void>;
};

/** 共用登录态；仅并发互不影响的页面，场景之间不能登出或修改同一资源。 */
export async function runParallelPages(context: BrowserContext, scenarios: ParallelScenario[], testInfo: Pick<TestInfo, 'attach'>,
    { maxConcurrency = 2 }: { maxConcurrency?: number } = {}) {
    if (!scenarios.length || scenarios.some((item) => !item.name) || new Set(scenarios.map((item) => item.name)).size !== scenarios.length) {
        throw new Error('场景名称不能为空或重复，至少需要一个场景');
    }
    if (!Number.isSafeInteger(maxConcurrency) || maxConcurrency < 1) throw new Error('maxConcurrency 必须为正整数');
    const queue = [...scenarios], failures: string[] = [];
    const worker = async () => {
        while (queue.length) {
            const scenario = queue.shift();
            if (!scenario) return;
            let page: Page | undefined;
            try {
                page = await context.newPage();
                await scenario.run(page, (name, options) => testInfo.attach(`scenario:${scenario.name}:${name}`, options));
            } catch { failures.push(`${scenario.name}: 场景执行失败（不输出可能含凭据的原始异常）`); }
            finally {
                try { await page?.close(); } catch { failures.push(`${scenario.name}: 页面关闭失败`); }
            }
        }
    };
    await Promise.all(Array.from({ length: Math.min(maxConcurrency, scenarios.length) }, worker));
    if (failures.length) throw new Error(failures.join('\n'));
}
