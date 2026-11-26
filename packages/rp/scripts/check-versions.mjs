import { readManifest, readGitManifest } from './load-prototype.mjs';
import { resolveVersionRef } from '../prototype/git-version-ref.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateCatalog, completeProduct } from '../prototype/model.mjs';
export { validateCatalog, immutableErrors } from '../prototype/model.mjs';
import { validateSourceWorkflow, frozenBaselineErrors } from '../prototype/source-workflow.mjs';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const root = fileURLToPath(new URL('../', import.meta.url));
    const git = (...args) => execFileSync('git', ['-C', root, ...args], { encoding: 'utf8' }).trim();
    const data = readManifest(root);
    const pages = JSON.parse(await readFile(new URL('../prototype/pages.json', import.meta.url), 'utf8'));
    const prefix = git('rev-parse', '--show-prefix');
    const base = process.argv.includes('--base') ? process.argv[process.argv.indexOf('--base') + 1] : process.env.PROTOTYPE_BASE_REF;
    const readRef = ref => readGitManifest(git, ref, prefix);
    let previous = readRef('HEAD');
    const errors = validateCatalog(data);
    if (base && !/^0+$/.test(base)) previous = readRef(base);
    const versionRef = (ref, tree) => resolveVersionRef(ref, tree, candidate => {
        try { git('rev-parse', '--verify', `${candidate}^{commit}`); return true; } catch { return false; }
    }, () => git('log', '--format=%H %T').split('\n').map(line => { const [commit, tree] = line.split(' '); return { commit, tree }; }));
    const refs = new Set(['HEAD']);
    if (base && !/^0+$/.test(base)) refs.add(base);
    const active = data.releases.find(item => item.status === 'in_progress');
    if (active?.editBase) refs.add(versionRef(active.editBase, active.editBaseTree));
    const built = data.releases.find(item => item.id === data.current);
    if (built?.status === 'completed' && built.implementationRef) refs.add(versionRef(built.implementationRef, built.implementationTree));
    const files = new Set();
    const add = output => { for (const file of output.split('\0').filter(Boolean)) if (file.startsWith(prefix)) files.add(file.slice(prefix.length)); };
    for (const ref of refs) add(git('diff', '--name-only', '-z', ref, '--', '.'));
    add(git('ls-files', '--others', '--exclude-standard', '--full-name', '-z', '--', '.'));
    const baselines = JSON.parse(await readFile(new URL('../prototype/page-baselines.json', import.meta.url), 'utf8'));
    const baselineRef = base && !/^0+$/.test(base) ? base : 'HEAD';
    const oldBaselines = JSON.parse(git('show', `${baselineRef}:${prefix}prototype/page-baselines.json`));
    errors.push(...frozenBaselineErrors(oldBaselines, baselines));
    const product = completeProduct(data.releases, data.current, baselines);
    for (const page of pages.pages.filter(page => !page.retired)) if (!product.pages.some(item => item.pageId === page.id && item.platform === page.platform && item.path === page.path)) errors.push(`稳定页面缺少当前版本记录：${page.id}`);
    for (const page of product.pages) if (!pages.pages.some(item => !item.retired && item.id === page.pageId && item.platform === page.platform)) errors.push(`完整目录缺少稳定页面登记：${page.pageId}`);
    errors.push(...validateSourceWorkflow(data, pages, [...files], previous));
    if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
    console.log(`版本说明检查通过：${data.releases.length} 个版本，${active ? active.id + ' 进行中' : '全部已完结'}`);
}
