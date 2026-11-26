import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveVersionRef } from './git-version-ref.mjs';
test('主仓直接使用原 SHA，subtree 在完整历史中定位同目录树', () => {
    const tree = 'b'.repeat(40);
    assert.equal(resolveVersionRef('main-sha', tree, () => true, () => { throw new Error('不应扫描'); }), 'main-sha');
    assert.equal(resolveVersionRef('main-sha', tree, () => false, () => [{ commit: 'split-sha', tree }]), 'split-sha');
    assert.throws(() => resolveVersionRef('missing', tree, () => false, () => []), /完整历史/);
    assert.throws(() => resolveVersionRef('missing', undefined, () => false, () => []), /登记对应目录树/);
});
