import { test, expect } from "../../../support/fixtures/test";
import { readAccessBoundary } from "../../../support/steps/system/access-boundary";
import { attachState } from "../../../support/helpers/evidence";

test('核心业务、本人资料、授权快照和登出接口拒绝未认证请求', async ({ backend }, testInfo) => {
    const state = await test.step('独立无凭证上下文检查鉴权边界', () => readAccessBoundary(backend));
    await attachState(testInfo, 'access-state', state);
    expect(state).toHaveLength(10);
    for (const observation of state) {
        expect(observation.httpStatus).toBe(401);
        expect(observation.code).toBe(100101);
        expect(observation.dataIsNull).toBe(true);
    }
});
