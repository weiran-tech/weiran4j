import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

export function resolveNpmRelease(tag, root = process.cwd()) {
    const match = /^(manage|prototype|rp)-v((?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?)$/.exec(tag);
    if (!match) throw new Error('标签必须为 manage-vX.Y.Z、prototype-vX.Y.Z 或 rp-vX.Y.Z');
    const kind = match[1] === 'manage' ? 'manage' : 'prototype';
    const directory = `packages/component-${kind}`;
    const pkg = JSON.parse(readFileSync(resolve(root, directory, 'package.json'), 'utf8'));
    if (pkg.name !== `@weiran-tech/${kind}` || pkg.version !== match[2]) throw new Error('标签与目标包的名称或版本不一致');
    return { directory, name: pkg.name, version: pkg.version, distTag: pkg.version.includes('-') ? 'next' : 'latest' };
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
    const release = resolveNpmRelease(process.argv[2] ?? process.env.GITHUB_REF_NAME ?? '');
    for (const [key, value] of Object.entries(release)) console.log(`${key}=${value}`);
}
