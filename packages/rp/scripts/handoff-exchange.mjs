import { readReview, reviewComments } from './discussion-api.mjs';
import { reviewReference } from '../prototype/review-source.mjs';
/** 仅读取 GitHub 最新正文，生成本地交接包 / 合并正文，不自动覆盖 Issue。 */
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { parseHandoff, normalizeHandoff, handoffMarkdown, signedConfirmations, deliveryApprovalErrors, participantErrors } from '../prototype/handoff.mjs';
import { mergeHandoff, handoffTransfer } from '../prototype/handoff-transfer.mjs';
const [mode, input] = process.argv.slice(2).filter((value) => value !== '--');
const catalog = JSON.parse(await readFile('prototype/releases.json', 'utf8'));
const transfer = mode === 'prepare' ? JSON.parse(await readFile(input, 'utf8')) : null;
const version = mode === 'pull' ? input : transfer?.version;
const release = catalog.releases.find((item) => item.id === version);
if (!release || !['pull', 'prepare'].includes(mode) || !reviewReference(version)) throw new Error('用法：pnpm handoff:pull -- <版本> 或 pnpm handoff:prepare -- <网页下载的交接包>；先登记主评审记录');
if (mode === 'prepare') { await rm(`.prototype-data/${version}-handoff-ready.md`, { force: true }); await rm(`.prototype-data/${version}-handoff-merged.json`, { force: true }); }
const issue = await readReview(version);
const remote = normalizeHandoff(parseHandoff(issue.body), release);
await mkdir('.prototype-data', { recursive: true });
const target = `.prototype-data/${version}-handoff`;
if (mode === 'pull') {
    const comments = await reviewComments(version, issue);
    const policy = JSON.parse(await readFile('prototype/review-policy.json', 'utf8'));
    const confirmations = await signedConfirmations(remote, comments, policy);
    await writeFile(`${target}.json`, JSON.stringify({ ...handoffTransfer(remote, remote, issue.updated_at), confirmations }, null, 2));
    console.log(`已读取实时 GitHub 记录：${target}.json（${issue.updated_at}）；可在工作台导入合并。`);
} else {
    if (transfer.kind !== 'prototype-handoff') throw new Error('需要网页下载的带来源交接包');
    const result = mergeHandoff(transfer.base ? normalizeHandoff(transfer.base, release) : null, normalizeHandoff(transfer.draft, release), remote);
    if (result.conflicts.length) {
        await writeFile(`${target}-latest.json`, JSON.stringify(handoffTransfer(remote, remote, issue.updated_at), null, 2));
        await writeFile(`${target}-conflicts.json`, JSON.stringify(result.conflicts, null, 2));
        throw new Error(`检测到 ${result.conflicts.length} 处并行修改；导入实时包在网页逐项合并后重新下载、prepare。未生成可覆盖的正文。`);
    }
    const comments = await reviewComments(version, issue);
    const policy = JSON.parse(await readFile('prototype/review-policy.json', 'utf8'));
    if (reviewReference(version)?.kind === 'issue' && issue.state === 'closed' && !['accepted', 'delivered'].includes(result.value.phase)) throw new Error('完成需求验收前主交接单应保持打开，请先重新打开');
    const errors = [...participantErrors(result.value, policy), ...await deliveryApprovalErrors(result.value, comments, policy)];
    if (errors.length) throw new Error(errors.join('\n'));
    await writeFile(`${target}-merged.json`, JSON.stringify(handoffTransfer(result.value, remote, issue.updated_at), null, 2));
    await writeFile(`${target}-ready.md`, handoffMarkdown(result.value, release));
    console.log(`已基于 GitHub 最新正文合并：${target}-ready.md。保存评审正文前核对更新时间 ${issue.updated_at}；GitHub 手动编辑没有原子锁，期间有新修改请重新 prepare。`);
}
