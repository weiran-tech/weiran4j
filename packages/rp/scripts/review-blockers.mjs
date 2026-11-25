import { discussionThreads, readReview } from './discussion-api.mjs';
import { reviewReference } from '../prototype/review-source.mjs';
import { repository } from '../prototype/project.mjs';
import { blockerDecision } from '../prototype/handoff.mjs';
import { allPages } from './github-api.mjs';
export function discussionBlocker(thread, owner, version) {
    const replies = thread.replies.filter((item) => item.user?.login?.toLowerCase() === owner.toLowerCase() && item.body?.trim().startsWith(`/prototype resolve ${version} `)).sort((a, b) => Date.parse(a.updated_at) - Date.parse(b.updated_at));
    const latest = replies.at(-1);
    const result = blockerDecision({ number: thread.databaseId, state: 'closed' }, thread.replies, owner, version);
    if (latest && Date.parse(latest.updated_at) < Date.parse(thread.updated_at)) result.errors.push(`Discussion 阻塞评论 ${thread.url} 在复核后被修改，需重新确认`);
    return { result, latest };
}
export async function reviewBlockers(release, handoff) {
    const issues = (await allPages(`repos/${repository}/issues?state=all&labels=prototype%3Ablocker`)).filter((item) => !item.pull_request && new RegExp(`prototype-review:${release.id.replaceAll('.', '\\.')}(?=[:\\s]|$)`).test(item.body || ''));
    const results = await Promise.all(issues.map(async (issue) => blockerDecision(issue, issue.state === 'closed' ? await allPages(`repos/${repository}/issues/${issue.number}/comments`) : [], handoff.productOwner, release.id)));
    const discussionProblems = [];
    if (reviewReference(release.id)?.kind === 'discussion') {
        for (const thread of await discussionThreads((await readReview(release.id)).id)) {
            // 仅顶层独立行标记阻塞；隐藏评论不能消除既有阻塞。
            if (!/^prototype:blocker\s*$/m.test(thread.body || '')) continue;
            const { result, latest } = discussionBlocker(thread, handoff.productOwner, release.id);
            results.push(result);
            discussionProblems.push({ number: thread.databaseId, title: thread.body.split('\n').find((line) => line.trim() && line.trim() !== 'prototype:blocker') || '阻塞评审意见', state: result.errors.length ? 'open' : 'closed', url: thread.url, blocker: true, owners: [], decision: result.errors.length ? null : latest?.body.trim().split('\n')[0].split(' ').at(-1) });
        }
    }
    return { errors: results.flatMap((item) => item.errors), after: Math.max(0, ...results.map((item) => item.at)), issues: [...issues.map((item) => ({ number: item.number, state: item.state, url: item.html_url })), ...discussionProblems] };
}
