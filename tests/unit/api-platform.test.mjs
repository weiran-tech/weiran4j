import test from 'node:test';
import assert from 'node:assert/strict';
import { dictLifecycle, configLifecycle } from '../support/steps/api/platform.ts';
import { scenario } from '../synthetic/harness.mjs';

test('字典：重复、排序、启用项、修改与级联删除均经过实际步骤', async () => {
    const value = await scenario(dictLifecycle, { after: ({ model }) => { assert.equal(model.db.dict.length, 0); assert.equal(model.db.dictItem.length, 0); } });
    assert.equal(value.cascadeVerified, true);
});
test('配置：非空分组保护、私有公开拒绝，已有公开标题保持原样', async () => {
    const value = await scenario(configLifecycle, { after: ({ model }) => {
        assert.equal(model.db.config.length, 1); assert.equal(model.db.configGroup.length, 1);
        assert.equal(model.db.config[0].configValue, 'Synthetic');
    } }); assert.equal(value.whitelistReadOnly, true);
});
