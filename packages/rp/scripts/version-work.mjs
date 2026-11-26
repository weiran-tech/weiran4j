import { readManifest } from './load-prototype.mjs';
import { readFile, writeFile } from 'node:fs/promises';
import { workErrors, unresolvedConflicts, conflictFingerprint } from '../prototype/version-work.mjs';
const catalog = readManifest();
const file = new URL('../prototype/conflict-resolutions.json', import.meta.url);
const resolutions = JSON.parse(await readFile(file, 'utf8'));
const [version, other, platform, pageId, decision, evidence] = process.argv.slice(2).filter((arg) => arg !== '--');
const release = catalog.releases.find((item) => item.id === version);
if (other) {
    const conflict = release && unresolvedConflicts(release, catalog.releases, []).find((item) => item.version === other && item.platform === platform && item.pageId === pageId);
    if (!conflict || !decision?.trim() || !evidence?.trim()) throw new Error('解决冲突：pnpm version:work -- <本版> <对方版本> <manage|mobile> <页面编号> "解决结论" "对应代码或评审证据"；须先实际解决页面冲突');
    resolutions.push({ fingerprint: conflictFingerprint(release, conflict), decision, evidence, resolvedAt: new Date().toISOString() });
    await writeFile(file, JSON.stringify(resolutions, null, 2) + '\n');
    console.log('已登记当前页面内容的解决结论；内容再变更将重新阻塞。请提交解决代码和登记文件。');
} else {
    const errors = workErrors(release, catalog.releases, resolutions);
    if (release?.status !== 'in_progress' || catalog.activeVersion !== version || catalog.current !== version) errors.push('修改页面前必须选择唯一进行中版本');
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`工作版本 ${version} 检查通过，基线 ${release.baseline || '无'}；所有操作必须保持此版本上下文。`);
}
