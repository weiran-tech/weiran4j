import { test } from 'node:test';
import assert from 'node:assert/strict';
import { embedMode, embedUrl } from './embed.mjs';

test('双端纯页面参数保留版本、场景与 hash，并可恢复完整产品', () => {
    const path = embedUrl('/releases/v0.2/mobile/?version=v0.2&scenario=failure&review=1#/orders');
    assert.equal(embedMode(new URL(path, 'https://example.com').search), 'page');
    assert.ok(path.endsWith('#/orders'));
    assert.ok(path.includes('scenario=failure'));
    assert.ok(!path.includes('review='));
    assert.ok(!embedUrl(path, 'full').includes('embed='));
    assert.equal(embedMode('?embed=anything'), 'full');
});
