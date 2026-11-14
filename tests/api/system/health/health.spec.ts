import { test, expect } from "../../../support/fixtures/test";
import { readHealth } from "../../../support/steps/system/health";
import { attachState } from "../../../support/helpers/evidence";

test('后端公开健康检查无需登录', async ({ backend }, testInfo) => {
    const state = await test.step('读取公开健康检查', () => readHealth(backend));
    await attachState(testInfo, 'health-state', state);
    expect(state).toEqual({ httpStatus: 200, code: 0, health: 'UP' });
});
