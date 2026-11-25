import { workErrors } from '../prototype/version-work.mjs';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateCatalog, immutableErrors } from '../prototype/model.mjs';
export { validateCatalog, immutableErrors } from '../prototype/model.mjs';
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const data = JSON.parse(await readFile(new URL('../prototype/releases.json', import.meta.url), 'utf8'));
    const errors = validateCatalog(data);
    const resolutions = JSON.parse(await readFile(new URL('../prototype/conflict-resolutions.json', import.meta.url), 'utf8'));
    errors.push(...data.releases.filter((item) => !item.supersededBy && item.status !== 'baseline').flatMap((item) => workErrors(item, data.releases, resolutions)));
    const registry = JSON.parse(await readFile(new URL('../prototype/reviews.json', import.meta.url), 'utf8'));
    const discussions = JSON.parse(await readFile(new URL('../prototype/discussions.json', import.meta.url), 'utf8'));
    const records = { ...registry, ...discussions };
    if (Object.values(discussions).some((number) => !Number.isInteger(number) || number < 1) || Object.keys(discussions).some((id) => !data.releases.some((release) => release.id === id))) errors.push('Discussion 登记必须匹配版本且编号有效');
    if (new Set(Object.values(discussions)).size !== Object.keys(discussions).length) errors.push('Discussion 编号不得跨版本复用');
    const current = data.releases.find((item) => item.id === data.current);
    if (['review', 'finalized'].includes(current?.status) && (!Number.isInteger(records[current.id]) || records[current.id] < 1)) errors.push('进入 review 前必须登记版本评审记录：pnpm version:review -- ' + current.id + ' <discussion:编号>');
    if (new Set(Object.values(registry)).size !== Object.keys(registry).length) errors.push('版本主 Issue 编号不得复用');
    const ref = process.env.PROTOTYPE_BASE_REF;
    if (ref) { const old = JSON.parse(execFileSync('git', ['show', `${ref}:prototype/releases.json`], { encoding: 'utf8' })); errors.push(...immutableErrors(old, data)); }
    if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
    console.log(`版本说明检查通过：${data.releases.length} 个版本`);
}
