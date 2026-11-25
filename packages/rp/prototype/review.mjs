import catalog from './releases.json' with { type: 'json' };
import { handoffIssueUrl } from './handoff.mjs';
import { versionDiscussions } from './project.mjs';
import { repository } from './project.mjs';
const allowed = ['version', 'baseline', 'page', 'change', 'scenario', 'compare', 'view', 'embed', 'scene', 'step'];
/** 分享时仅保留原型上下文，避免把地址栏的无关参数带到评审记录。 */
export function cleanContextUrl(value) {
    if (!value) return '';
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return '';
    url.username = ''; url.password = '';
    for (const key of [...url.searchParams.keys()]) if (!allowed.includes(key)) url.searchParams.delete(key);
    return url.href;
}
export function reviewLinks(context) {
    const { version, baseline, change, platform, pageId, page, scenario = 'normal' } = context;
    const commit = (context.pageUrl || context.comparisonUrl || '').match(/\/releases\/v[^/]+-rc-([a-f0-9]{40})\//)?.[1];
    const marker = `prototype-review:${version}${change ? `:${change.id}` : ''}`;
    const lines = [
        `评审标识：${marker}`,
        `版本：${version}；基线：${baseline || '无'}`,
        `改动：${change ? `${change.id} · ${change.title}` : '版本整体评审'}`,
        `适用端：${platform === 'mobile' ? '手机端 · Vant' : platform === 'manage' ? '管理端 · Semi' : '管理端 / 手机端'}`,
        `页面编号：${pageId || '版本整体'}；地址：${page || '见版本中心'}`,
        `场景：${scenario}`,
        `评审构建提交：${commit || '未固定，请从交接工作台选择固定候选'}`,
        context.pageUrl && `原型：${cleanContextUrl(context.pageUrl)}`,
        context.comparisonUrl && `对比：${cleanContextUrl(context.comparisonUrl)}`,
        '', '## 问题 / 评审意见', '', '请描述复现步骤、实际表现和期望行为，可直接粘贴截图。',
        '', '## 处理与复核', '', '- [ ] 明确结论与负责人', '- [ ] 关联修复提交或后续版本', '- [ ] 按原场景复核，在同一评论串记录采用 / 暂缓 / 不采用结论',
        '', '阻塞问题请在顶层评论独立一行填写 prototype:blocker，由产品本人在该评论下回复：', `/prototype resolve ${version} adopted`, '原因：填写决定理由', '证据：https://填写复核链接', '结论也可用 rejected / deferred；deferred 另写 承接：https://后续任务。',
    ].filter((line) => line !== false && line !== undefined);
    const release = catalog.releases.find((item) => item.id === version);
    const create = new URL(release ? handoffIssueUrl(repository, release) : `https://github.com/${repository}/discussions/new`);
    create.searchParams.set('category', 'general');
    create.searchParams.set('title', `[版本评审][${version}]${release ? ` ${release.title}` : ''}`);
    create.searchParams.set('body', [create.searchParams.get('body'), '## 走查上下文（意见请按评论串记录）', lines.join('\n')].filter(Boolean).join('\n\n'));
    const history = new URL(`https://github.com/${repository}/discussions`);
    history.searchParams.set('q', `"${marker}"`);
    return { create: create.href, history: history.href, thread: versionDiscussions[version] ? `https://github.com/${repository}/discussions/${versionDiscussions[version]}` : null, body: lines.join('\n') };
}
