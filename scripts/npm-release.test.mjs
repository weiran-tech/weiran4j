import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { resolveNpmRelease } from './npm-release.mjs';
test('manage 标签与 prototype/rp 别名准确匹配目标包和版本', () => {
    const root = mkdtempSync(join(tmpdir(), 'weiran-npm-release-'));
    try {
        for (const [kind, version] of [['manage', '0.5.0'], ['prototype', '0.1.0']]) {
            const dir = join(root, 'packages', `component-${kind}`); mkdirSync(dir, { recursive: true });
            writeFileSync(join(dir, 'package.json'), JSON.stringify({ name: `@weiran-tech/${kind}`, version }));
        }
        assert.equal(resolveNpmRelease('manage-v0.5.0', root).name, '@weiran-tech/manage');
        assert.deepEqual(resolveNpmRelease('rp-v0.1.0', root), resolveNpmRelease('prototype-v0.1.0', root));
        for (const tag of ['semi-components-v0.5.0', 'rp-v0.2.0', 'lib-v0.1.0', 'manage-v01.5.0', 'rp-v0.1.0;echo bad']) assert.throws(() => resolveNpmRelease(tag, root));
    } finally { rmSync(root, { recursive: true, force: true }); }
});
