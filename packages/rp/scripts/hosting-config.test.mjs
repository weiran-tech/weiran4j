import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
test('Vercel cleanUrls 回退不引用 html 扩展名，版本根跳转不拦截索引文件', async () => {
    const config = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
    if (config.cleanUrls) for (const rule of config.rewrites) assert.ok(!rule.destination.endsWith('.html'), rule.destination);
    assert.ok(!config.redirects.some((rule) => rule.source === '/versions/:version'), '无约束的版本根跳转会拦截 /versions/index.json');
    assert.ok(config.rewrites.some((rule) => rule.destination === '/versions/:version/'));
    assert.ok(config.rewrites.some((rule) => rule.destination === '/releases/:version/'));
});
