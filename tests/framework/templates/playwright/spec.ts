import { test, expect } from '../../../support/fixtures/test';
import { attachState } from '../../../support/helpers/evidence';

// 通过 init 生成实际流程；生成器按目录计算引用。实现共享步骤后替换失败占位。
test('替换为可观察的业务场景', async ({ page }, testInfo) => {
    await test.step('替换为实际业务步骤', async () => {
        throw new Error('请实现真实步骤和业务断言，模板不能直接算通过');
    });
    await attachState(testInfo, 'observed-state', { url: page.url() });
    expect(page.url()).not.toBe('about:blank');
});
