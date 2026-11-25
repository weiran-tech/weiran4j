import { test } from 'node:test';
import assert from 'node:assert/strict';
import { graphql, readDiscussion, discussionThreads } from './discussion-api.mjs';
import { discussionBlocker } from './review-blockers.mjs';

test('Discussion 评论和回复完整分页，保留本人身份和编辑时间，读取异常不降级', async () => {
    const old = globalThis.fetch;
    const calls = [];
    const pageInfo = (next = null) => ({ hasNextPage: Boolean(next), endCursor: next });
    const entry = (id, body = '/prototype approve candidate fingerprint') => ({ id, body, author: { login: 'pm' }, updatedAt: '2026-11-24T01:00:00Z', createdAt: '2026-11-24T00:00:00Z', url: `https://github.com/example/discussions/1#${id}` });
    try {
        globalThis.fetch = async (_, options) => {
            const { query, variables } = JSON.parse(options.body); calls.push(variables);
            if (query.includes('discussion(number')) return Response.json({ data: { repository: { discussion: { id: 'D1', number: 1, body: 'handoff', url: 'https://github.com/example/discussions/1', updatedAt: 'time', closed: false } } } });
            if (query.includes('... on Discussion{')) return Response.json({ data: { node: { comments: { nodes: variables.after ? [entry('C2')] : [entry('C1')], pageInfo: pageInfo(variables.after ? null : 'next-comment') } } } });
            const secondReply = variables.id === 'C1' && variables.after;
            return Response.json({ data: { node: { replies: { nodes: variables.id === 'C1' ? [entry(secondReply ? 'R2' : 'R1')] : [], pageInfo: pageInfo(variables.id === 'C1' && !secondReply ? 'next-reply' : null) } } } });
        };
        const record = await readDiscussion(1); assert.equal(record.state, 'open'); assert.equal(record.updated_at, 'time');
        const threads = await discussionThreads('D1');
        assert.equal(threads.length, 2); assert.equal(threads[0].replies.length, 2);
        assert.equal(threads[0].replies[1].user.login, 'pm');
        assert.equal(threads[0].replies[1].updated_at, '2026-11-24T01:00:00Z');
        assert.ok(calls.some((item) => item.after === 'next-reply')); assert.ok(calls.some((item) => item.after === 'next-comment'));
        globalThis.fetch = async () => Response.json({ errors: [{ message: 'denied' }] });
        await assert.rejects(graphql('query{}', {}), /读取失败/);
        globalThis.fetch = async () => Response.json({ data: { node: null } });
        await assert.rejects(discussionThreads('D1'), /读取不完整/);
    } finally { globalThis.fetch = old; }
});

test('Discussion 阻塞仅接受该评论下产品本人有效结论，编辑后需重新复核', () => {
    const thread = { databaseId: 1, url: 'https://github.com/example/discussions/1#comment', updated_at: '2026-11-24T00:00:00Z', replies: [] };
    assert.ok(discussionBlocker(thread, 'pm', 'v0.8').result.errors.length);
    const reply = { user: { login: 'dev' }, body: '/prototype resolve v0.8 adopted\n原因：已修正\n证据：https://example.com/proof', updated_at: '2026-11-24T01:00:00Z' };
    thread.replies = [reply]; assert.ok(discussionBlocker(thread, 'pm', 'v0.8').result.errors.length);
    reply.user.login = 'pm'; assert.deepEqual(discussionBlocker(thread, 'pm', 'v0.8').result.errors, []);
    thread.updated_at = '2026-11-24T02:00:00Z'; assert.match(discussionBlocker(thread, 'pm', 'v0.8').result.errors.join(), /重新确认/);
    thread.updated_at = '2026-11-24T00:00:00Z'; reply.body = reply.body.replace('adopted', 'deferred');
    assert.ok(discussionBlocker(thread, 'pm', 'v0.8').result.errors.length);
    reply.body += '\n承接：https://example.com/task'; assert.deepEqual(discussionBlocker(thread, 'pm', 'v0.8').result.errors, []);
});
