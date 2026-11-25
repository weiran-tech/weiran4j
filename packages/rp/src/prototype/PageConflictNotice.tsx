import { unresolvedConflicts } from '../../prototype/version-work.mjs';
import resolutions from '../../prototype/conflict-resolutions.json';
import { releases, sitePath, type Release } from './catalog';
import { PortalLink } from './PortalRouter';

export function PageConflictNotice({ release, catalog = releases }: { release: Release; catalog?: Release[] }) {
    const conflicts = unresolvedConflicts(release, catalog, resolutions);
    if (!conflicts.length) return null;
    return <aside className="proto-card proto-validation" aria-label="同基线页面冲突提示"><h3>页面冲突 · 已阻止继续工作 · {conflicts.length} 项</h3><p>必须先解决以下页面冲突并登记代码或评审证据，才能继续编辑、开发与构建。以下版本也从 {release.baseline} 调整了同一端的同一页面。请产品同学核对规则与交互，明确各版范围；这些版本不会自动合并。</p><details><summary>查看涉及的版本与页面</summary><ul>{conflicts.map((item) => <li key={`${item.version}:${item.platform}:${item.pageId}`}><PortalLink href={sitePath('/rp/versions', item.version)}>{item.version}</PortalLink> · {item.platform === 'mobile' ? '手机端' : '管理端'} · {item.title}（{item.pageId}）<p>本版：{item.local.map((change) => `${change.id} ${change.title}`).join('；')}<br />对方：{item.remote.map((change) => `${change.id} ${change.title}`).join('；')}</p></li>)}</ul></details><p>先解决页面实现与规则，再执行 <code>pnpm version:work -- {release.id} 对方版本 manage或mobile 页面编号 "解决结论" "代码或评审证据"</code> 并提交。改动内容变化后须重新解决。</p><p className="proto-muted">依据已登记的基线、端与稳定页面编号判断潜在冲突；无法检测尚未登记的其他分支改动。</p></aside>;
}
