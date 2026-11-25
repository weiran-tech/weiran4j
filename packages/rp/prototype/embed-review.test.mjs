import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedMode, embedUrl } from './embed.mjs';
import { cleanContextUrl, reviewLinks } from './review.mjs';

test('双端纯页面参数保留版本、场景与 hash，并可恢复完整产品', () => {
    const path = embedUrl('/releases/v0.2/mobile/?version=v0.2&scenario=failure&review=1#/orders');
    assert.equal(embedMode(new URL(path, 'https://example.com').search), 'page');
    assert.ok(path.endsWith('#/orders'));
    assert.ok(path.includes('scenario=failure'));
    assert.ok(!path.includes('review='));
    assert.ok(!embedUrl(path, 'full').includes('embed='));
    assert.equal(embedMode('?embed=anything'), 'full');
});
test('Discussion 预填与查找使用同一版本改动标记，携带页面、基线及场景', () => {
    const links = reviewLinks({ version: 'v0.4', baseline: 'v0.2', change: { id: 'CHG-001', title: '退款 & 重试' }, platform: 'mobile', pageId: 'mobile-orders', page: '/mobile/#/orders', scenario: 'failure', pageUrl: 'https://demo.example/mobile/?version=v0.4&token=secret&scenario=failure#/orders' });
    const create = new URL(links.create); const body = create.searchParams.get('body');
    assert.equal(create.pathname, '/weiran-tech/rp-example/discussions/new');
    for (const value of ['prototype-review:v0.4:CHG-001', 'mobile-orders', 'v0.2', 'failure', '#/orders']) assert.ok(body.includes(value));
    assert.ok(!body.includes('secret'));
    assert.ok(new URL(links.history).searchParams.get('q').includes('prototype-review:v0.4:CHG-001'));
    assert.ok(!new URL(links.history).searchParams.get('q').includes('is:open'));
});
test('Discussion 分享仅允许页面上下文参数，不包含凭证或无关查询', () => {
    assert.equal(cleanContextUrl('https://user:pass@example.com/a?token=secret&embed=page&version=v0.4'), 'https://example.com/a?embed=page&version=v0.4');
    assert.equal(cleanContextUrl('javascript:alert(1)'), '');
});
