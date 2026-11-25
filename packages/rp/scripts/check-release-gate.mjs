import { readReview, reviewComments } from './discussion-api.mjs';
import { reviewReference } from '../prototype/review-source.mjs';
import { readFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { approvalErrors, handoffErrors, parseHandoff, normalizeHandoff, deliveryApprovalErrors } from '../prototype/handoff.mjs';
import { reviewFingerprint } from './review-fingerprint.mjs';
import { reviewBlockers } from './review-blockers.mjs';
export async function releaseGate(release) {
    const number = reviewReference(release.id)?.number; if (!number) throw new Error('当前版本尚未关联 GitHub 交接主评审记录');
    const issue = await readReview(release.id);
    if (issue.pull_request) throw new Error('交接记录不能是 Pull Request');
    const handoff = normalizeHandoff(parseHandoff(issue.body), release);
    const errors = handoffErrors(handoff, release);
    if (reviewReference(release.id)?.kind === 'issue' && issue.state === 'closed' && !['accepted', 'delivered'].includes(handoff.phase)) errors.push('完成需求验收前主交接单应保持打开，请先重新打开');
    if (handoff.phase === 'preparation') errors.push('需求整理阶段不能定稿，请先发起固定候选评审');
    if (!new RegExp(`^${release.id.replaceAll('.', '\\.').replaceAll('-', '\\-')}-rc-[a-f0-9]{40}$`).test(handoff.candidateId || '')) throw new Error('需要准确的固定评审候选编号');
    if (!/^[a-f0-9]{64}$/.test(handoff.candidateFingerprint || '') || !/^[a-f0-9]{40}$/.test(handoff.candidateCommit || '')) throw new Error('候选提交或业务指纹无效');
    const candidate = JSON.parse(await readFile(`.prototype-archives/${handoff.candidateId}/prototype-build.json`, 'utf8'));
    if (candidate.version !== handoff.candidateId || candidate.base !== `/releases/${candidate.version}/` || !candidate.version.endsWith(candidate.commit) || candidate.kind !== 'candidate' || candidate.prototypeVersion !== release.id || candidate.commit !== handoff.candidateCommit || candidate.fingerprint !== handoff.candidateFingerprint || candidate.fingerprint !== reviewFingerprint()) errors.push('候选构建、交接记录或当前业务内容不一致，必须重新生成候选并评审');
    if (!/^https:\/\//.test(handoff.candidateUrl || '') || /(?:localhost|127\.0\.0\.1|0\.0\.0\.0)/i.test(handoff.candidateUrl || '') || new URL(handoff.candidateUrl).pathname !== candidate.base + 'prototype/workflow') errors.push('需要团队可访问且指向此候选的 HTTPS 交接地址');
    execFileSync('git', ['merge-base', '--is-ancestor', candidate.commit, 'HEAD']);
    if (release.baseline) { const baseline = JSON.parse(await readFile(`.prototype-archives/${release.baseline}/prototype-build.json`, 'utf8')); if (baseline.version !== release.baseline || baseline.kind === 'candidate') errors.push('基线不是已归档定稿版本'); }
    const policy = JSON.parse(await readFile('prototype/review-policy.json', 'utf8'));
    const [comments, blockers] = await Promise.all([reviewComments(release.id, issue), reviewBlockers(release, handoff)]);
    errors.push(...blockers.errors, ...approvalErrors(handoff, candidate, comments, policy, blockers.after), ...await deliveryApprovalErrors(handoff, comments, policy));
    if (errors.length) throw new Error(errors.join('\n'));
    console.log(`定稿门禁通过：${release.id}，候选 ${candidate.version}，主评审记录 #${number}`);
}
if (process.argv[1]?.endsWith('check-release-gate.mjs')) {
    const catalog = JSON.parse(await readFile('prototype/releases.json', 'utf8'));
    const release = catalog.releases.find((item) => item.id === catalog.current);
    if (release.status !== 'finalized') console.log('当前版本未定稿；正式发布将执行在线评审门禁。');
    else await releaseGate(release);
}
