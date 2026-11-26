import { readManifest } from './load-prototype.mjs';
import { readReview, reviewComments } from './discussion-api.mjs';
import { reviewReference } from '../prototype/review-source.mjs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { repository, versionReviews, versionDiscussions } from '../prototype/project.mjs';
import { parseHandoff, normalizeHandoff, handoffErrors, approvalErrors, signedConfirmations, deliveryApprovalErrors, participantErrors, blockerDecision } from '../prototype/handoff.mjs';
import { allPages } from './github-api.mjs';
import { reviewBlockers } from './review-blockers.mjs';
const catalog = readManifest(process.cwd(), { allowLegacy: true });
const policy = JSON.parse(await readFile('prototype/review-policy.json', 'utf8'));
const versions = {};
const reviewIssues = await allPages(`repos/${repository}/issues?state=all`);
for (const [version, number] of Object.entries({ ...versionReviews, ...versionDiscussions })) {
    const issue = await readReview(version);
    const release = catalog.releases.find((item) => item.id === version);
    if (release?.supersededBy) {
        let handoff = null; try { handoff = normalizeHandoff(parseHandoff(issue.body), release); } catch { /* 历史人工记录仍在原 Issue 可查 */ }
        versions[version] = { number, url: issue.html_url, updatedAt: issue.updated_at, state: issue.state, handoff, errors: [], supersededBy: release.supersededBy, confirmations: { acceptances: {}, publication: null } };
        continue;
    }
    try {
        if (issue.pull_request || !release) throw new Error('主评审记录与版本不匹配');
        const handoff = normalizeHandoff(parseHandoff(issue.body), release);
        const comments = await reviewComments(version, issue);
        const errors = [...handoffErrors(handoff, release), ...participantErrors(handoff, policy), ...await deliveryApprovalErrors(handoff, comments, policy)];
        if (reviewReference(version)?.kind === 'issue' && issue.state === 'closed' && !['accepted', 'delivered'].includes(handoff.phase)) errors.push('完成需求验收前主交接单应保持打开');
        const confirmations = await signedConfirmations(handoff, comments, policy);
        const problems = await Promise.all(reviewIssues.filter((entry) => !entry.pull_request && (entry.number !== number || reviewReference(version)?.kind === 'discussion') && new RegExp(`prototype-review:${version.replaceAll('.', '\\.')}(?=[:\\s]|$)`).test(entry.body || '')).map(async (entry) => {
            const problemComments = entry.state === 'closed' ? await allPages(`repos/${repository}/issues/${entry.number}/comments`) : [];
            const decision = blockerDecision(entry, problemComments, handoff.productOwner, version);
            const last = problemComments.filter((comment) => comment.user?.login?.toLowerCase() === handoff.productOwner.toLowerCase() && comment.body?.trim().startsWith(`/prototype resolve ${version} `)).sort((a, b) => Date.parse(a.updated_at || a.created_at) - Date.parse(b.updated_at || b.created_at)).at(-1);
            return { number: entry.number, title: entry.title, url: entry.html_url, state: entry.state, blocker: entry.labels.some((label) => (label.name || label) === 'prototype:blocker'), owners: entry.assignees.map((person) => person.login), decision: decision.errors.length ? null : last.body.trim().split('\n')[0].split(' ').at(-1) };
        }));
        const blockers = await reviewBlockers(release, handoff);
        problems.push(...blockers.issues.filter((item) => item.blocker));
        if (handoff.phase !== 'preparation') {
            errors.push(...blockers.errors);
            try {
                const candidate = JSON.parse(await readFile(`.prototype-archives/${handoff.candidateId}/prototype-build.json`, 'utf8'));
                if (candidate.kind !== 'candidate' || candidate.prototypeVersion !== version || candidate.commit !== handoff.candidateCommit || candidate.fingerprint !== handoff.candidateFingerprint) errors.push('候选身份与交接记录不一致');
                errors.push(...approvalErrors(handoff, candidate, comments, policy, blockers.after));
            } catch { errors.push('候选归档尚未恢复或记录不可读'); }
        }
        versions[version] = { number, url: issue.html_url, updatedAt: issue.updated_at, state: issue.state, handoff, errors, confirmations, problems };
    } catch (error) { versions[version] = { number, url: issue.html_url, updatedAt: issue.updated_at, state: issue.state, handoff: null, errors: [error.message], confirmations: { acceptances: {}, publication: null } }; }
}
await mkdir('.prototype-data', { recursive: true });
await writeFile('.prototype-data/handoffs.json', JSON.stringify({ syncedAt: new Date().toISOString(), versions }, null, 2));
console.log(`已同步 ${Object.keys(versions).length} 份 GitHub 交接记录；报告不包含凭证。`);
