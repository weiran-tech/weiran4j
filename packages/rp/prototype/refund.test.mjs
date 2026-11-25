import { test } from 'node:test';
import assert from 'node:assert/strict';
import { money, parseRefund } from './refund.mjs';
test('退款金额使用分计算并拒绝越界、零、负数及超过两位小数', () => {
    for (const value of ['0', '-1', '1.001', '1e2', 'NaN', '', '128.01']) assert.ok(parseRefund(value, 12800).error, value);
    assert.equal(parseRefund('0.01', 12800).cents, 1);
    assert.equal(parseRefund('128.00', 12800).cents, 12800);
    assert.equal(parseRefund(' 12.3 ', 12800).cents, 1230);
    assert.equal(money(1230), '12.30');
    assert.ok(parseRefund('0.01', 0).error);
});
