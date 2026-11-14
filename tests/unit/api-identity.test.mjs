import test from 'node:test';
import assert from 'node:assert/strict';
import { userLifecycle, roleLifecycle, menuLifecycle } from '../support/steps/api/identity.ts';
import { scenario } from '../synthetic/harness.mjs';

for (const [name, operation] of [['user', userLifecycle], ['role', roleLifecycle], ['menu', menuLifecycle]]) {
    test(`${name} 生命周期：实际步骤断言并仅清理自建资源`, async () => {
        await scenario(operation, { after: ({ model }) => {
            assert.equal(model.db.user.length, 1); assert.equal(model.db.role.length, 0); assert.equal(model.db.menu.length, 1);
        } });
    });
}
test('陈旧用户草稿被错误接受时，步骤失败且本次数据仍清理', async () => {
    await assert.rejects(scenario(userLifecycle, { fault: { staleUpdateAccepted: true } }), /错误状态/);
});
