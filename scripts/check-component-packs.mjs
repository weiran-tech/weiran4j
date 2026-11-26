import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, symlinkSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
const root = process.cwd();
const work = mkdtempSync(join(tmpdir(), 'weiran-component-packs-'));
try {
    mkdirSync(join(work, 'node_modules', '@weiran-tech'), { recursive: true });
    for (const kind of ['manage', 'prototype']) {
        const directory = resolve(`packages/component-${kind}`);
        const [pack] = JSON.parse(execFileSync('npm', ['pack', '--json', '--pack-destination', work], { cwd: directory, encoding: 'utf8' }));
        const target = join(work, 'node_modules', '@weiran-tech', kind); mkdirSync(target);
        execFileSync('tar', ['-xzf', join(work, pack.filename), '-C', target, '--strip-components=1']);
        const pkg = JSON.parse(readFileSync(join(target, 'package.json'), 'utf8'));
        for (const entry of ['dist/index.js', 'dist/index.d.ts', 'dist/style.css']) {
            if (!pack.files.some(file => file.path === entry)) throw new Error(`${kind} 缺少 ${entry}`);
        }
        if (pack.files.some(file => /^(src|prototype|tests|node_modules)\//.test(file.path))) throw new Error('发布物包含源码、业务记录或依赖目录');
        for (const dependency of Object.keys(pkg.peerDependencies)) {
            const output = join(work, 'node_modules', dependency);
            mkdirSync(resolve(output, '..'), { recursive: true });
            try { symlinkSync(realpathSync(join(directory, 'node_modules', dependency)), output, 'dir'); }
            catch (error) { if (error.code !== 'EEXIST') throw error; }
        }
    }
    symlinkSync(realpathSync(join(root, 'packages/component-prototype/node_modules/@types')), join(work, 'node_modules/@types'), 'dir');
    writeFileSync(join(work, 'package.json'), JSON.stringify({ type: 'module' }));
    writeFileSync(join(work, 'consumer.tsx'), `import { TextAvatar, type UploadSettings } from '@weiran-tech/manage';
import { ReviewForm, QuickSearch, type Release, createReviewStore } from '@weiran-tech/prototype';
import { assembleManifest } from '@weiran-tech/prototype/core';
export const components = [TextAvatar, ReviewForm, QuickSearch];
export type Settings = UploadSettings;
export type Version = Release;
export const store = createReviewStore;
export const manifest = assembleManifest;
`);
    execFileSync(join(root, 'node_modules/.bin/tsc'), ['--noEmit', '--strict', '--skipLibCheck', '--moduleResolution', 'bundler', '--module', 'esnext', '--target', 'es2023', '--jsx', 'react-jsx', 'consumer.tsx'], { cwd: work, stdio: 'inherit' });
    writeFileSync(join(work, 'core.mjs'), "import { assembleManifest } from '@weiran-tech/prototype/core'; if (assembleManifest({current:'v1.0',activeVersion:null},{'prototype/versions/v1.0/version.json':{id:'v1.0'}}).current !== 'v1.0') throw new Error('core failed');");
    execFileSync(process.execPath, ['core.mjs'], { cwd: work, stdio: 'inherit' });
    console.log('两个 npm tarball 的 JS、类型、样式和无 React 的 core 入口验证通过');
} finally { rmSync(work, { recursive: true, force: true }); }
