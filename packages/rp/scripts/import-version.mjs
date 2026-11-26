import { readManifest, writeManifest } from './load-prototype.mjs';
import { readFile } from 'node:fs/promises';
import { mergeTransfer } from '../prototype/transfer.mjs';
const file = process.argv[2]; if (!file) throw new Error('用法：pnpm version:import <交接包.json>');
const catalog = readManifest(process.cwd(), { allowLegacy: true });
const result = mergeTransfer(JSON.parse(await readFile(file, 'utf8')), catalog);
if (result.conflicts.length) throw new Error(`存在冲突，先在网页逐项合并后导出：${result.conflicts.map((item) => item.path).join('、')}`);
writeManifest(result.catalog, process.cwd());
console.log('已合并本版说明，请将页面代码与说明一起提交 PR。');
