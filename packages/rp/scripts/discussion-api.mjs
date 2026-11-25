import { repository } from '../prototype/project.mjs';
import { github, allPages } from './github-api.mjs';
import { reviewReference } from '../prototype/review-source.mjs';
export async function graphql(query, variables) {
    const value = await github('graphql', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ query, variables }) });
    if (value.errors?.length || !value.data) throw new Error('Discussion 读取失败，请检查 discussions:read 权限及仓库功能；未使用历史记录代替');
    return value.data;
}
export async function readDiscussion(number) {
    const [owner, name] = repository.split('/');
    const value = await graphql('query($owner:String!,$name:String!,$number:Int!){repository(owner:$owner,name:$name){discussion(number:$number){id number title body url updatedAt closed}}}', { owner, name, number });
    const item = value.repository?.discussion;
    if (!item) throw new Error(`找不到 Discussion #${number}`);
    return { ...item, html_url: item.url, updated_at: item.updatedAt, state: item.closed ? 'closed' : 'open' };
}
function comment(item) { return { ...item, user: item.author, html_url: item.url, updated_at: item.updatedAt, created_at: item.createdAt }; }
/** 所有顶层评论与回复均分页，保留实际作者和编辑时间供签名检查。 */
export async function discussionThreads(id) {
    const threads = []; let after = null;
    do {
        const data = await graphql('query($id:ID!,$after:String){node(id:$id){... on Discussion{comments(first:100,after:$after){nodes{id databaseId body url updatedAt createdAt isMinimized author{login}} pageInfo{hasNextPage endCursor}}}}}', { id, after });
        const connection = data.node?.comments;
        if (!connection) throw new Error('Discussion 评论读取不完整');
        for (const item of connection.nodes) {
            const replies = []; let cursor = null;
            do {
                const data = await graphql('query($id:ID!,$after:String){node(id:$id){... on DiscussionComment{replies(first:100,after:$after){nodes{id body url updatedAt createdAt isMinimized author{login}} pageInfo{hasNextPage endCursor}}}}}', { id: item.id, after: cursor });
                const connection = data.node?.replies;
                if (!connection) throw new Error('Discussion 回复读取不完整');
                replies.push(...connection.nodes.filter((entry) => !entry.isMinimized).map(comment));
                cursor = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
                if (connection.pageInfo.hasNextPage && !cursor) throw new Error('Discussion 回复分页无效');
            } while (cursor);
            threads.push({ ...comment(item), replies });
        }
        after = connection.pageInfo.hasNextPage ? connection.pageInfo.endCursor : null;
        if (connection.pageInfo.hasNextPage && !after) throw new Error('Discussion 评论分页无效');
    } while (after);
    return threads;
}
export async function readReview(version) {
    const ref = reviewReference(version);
    if (!ref) throw new Error('请先登记版本评审记录');
    return ref.kind === 'discussion' ? readDiscussion(ref.number) : github(`repos/${repository}/issues/${ref.number}`);
}
export async function reviewComments(version, record) {
    const ref = reviewReference(version);
    if (!ref) throw new Error('请先登记版本评审记录');
    if (ref.kind === 'issue') return allPages(`repos/${repository}/issues/${ref.number}/comments`);
    const threads = await discussionThreads((record || await readReview(version)).id);
    return threads.flatMap((item) => [...(item.isMinimized ? [] : [item]), ...item.replies]);
}
