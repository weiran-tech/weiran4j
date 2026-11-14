import test from 'node:test';
import assert from 'node:assert/strict';
import { permissionBoundary } from '../support/steps/api/permissions.ts';
import { scenario } from '../synthetic/harness.mjs';

test('权限：独立Cookie主体、允许/拒绝、同会话撤权、修订变化与逆序清理', async () => {
    const value = await scenario(permissionBoundary, { after: ({ model }) => {
        assert.equal(model.db.user.length, 1); assert.equal(model.db.role.length, 0);
        assert.equal(model.db.menu[0].permission, 'system:user:list');
    } }); assert.equal(value.sameSessionRevocationVerified, true);
});
test('撤权未生效、授权快照主体错配均使真实步骤失败', async () => {
    await assert.rejects(scenario(permissionBoundary, { fault: { revokeIgnored: true } }), /错误状态/);
    await assert.rejects(scenario(permissionBoundary, { fault: { forceSnapshotMismatch: true } }), /快照/);
});
