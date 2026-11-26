import { PrototypeEntry, PrototypePageDirectory } from '@weiran-tech/prototype';
import { namespacePath } from '../../prototype/routes.mjs';
import { useState, type ReactNode } from 'react';
import { Button } from '@douyinfe/semi-ui';
import { ChangeNotesDrawer } from './ChangeNotesDrawer';
import { useLocation } from 'react-router-dom';
import { useMyMenus } from '@/hooks/queries/auth';
import { flattenMenuPages } from '@/utils/menu';
import { currentVersion, pageDiffs, previewTarget, productFor, releases, siteBase, sitePath, type Release } from './catalog';
import { useSnapshots } from './useSnapshots';

/** 目录来自所选版本的页面登记；历史页面地址只交给对应快照解析。 */
export function VersionPageDirectory({ release, platform, full = false, browse = false, technical = false, embedded = false, scopeControls, filters, appearance = 'legacy' }: { release: Release; platform?: 'manage' | 'mobile'; full?: boolean; browse?: boolean; technical?: boolean; embedded?: boolean; scopeControls?: ReactNode; filters?: ReactNode; appearance?: 'legacy' | 'version' }) {
    const snapshots = useSnapshots();
    const { data: menus = [] } = useMyMenus();
    const location = useLocation();
    const context = new URLSearchParams(location.search);
    const [notesPage, setNotesPage] = useState<string | null>(() => pageDiffs(release).find(page => page.changes.some(change => change.id === context.get('change')))?.key ?? null);
    const scenario = context.get('scenario') || 'normal';
    const entries = flattenMenuPages(menus);
    const complete = full || context.get('scope') === 'all';
    const product = productFor(release);
    const diffs = pageDiffs(release);
    const sourcePages = complete ? product.pages.map((page) => ({ ...page, before: page.path, after: page.path, changes: diffs.find((diff) => diff.key === page.key)?.changes || [] })) : diffs;
    const pages = sourcePages.filter((page) => (!platform || page.platform === platform) && (!browse || !/^\/rp(?:[/?#]|$)/.test(page.after || page.before || '')) && page.pageId !== 'mobile-form' && !(complete && release.routeSchema === 2 && /^\/manage\/demo(?:\/|$)/.test(page.after || '')));
    const groups = new Map<string, typeof pages>();
    for (const page of pages) {
        const path = namespacePath(page.after || page.before || '');
        const entry = release.id === currentVersion ? entries.find((item) => item.path === path.split(/[?#]/)[0]) : undefined;
        const savedGroup = product.pages.find((item) => item.key === page.key)?.group;
        const module = page.platform === 'mobile'
            ? (path.includes('#/orders') ? '订单与退款' : '手机端页面')
            : path === '/manage/refund-demo' || path === '/manage/refund' ? '业务交互示例'
                : path.startsWith('/rp') || path === '/rp' ? '原型协作' : entry?.parents.join(' / ') || savedGroup || '业务页面';
        const group = `${page.platform === 'mobile' ? '手机端' : '管理端'} · ${module}`;
        groups.set(group, [...(groups.get(group) || []), page]);
    }
    const available = snapshots.data || [];
    const fullTargets = (platform && !browse ? [platform] : ['manage', 'mobile']).map((end) => ({ end, ...previewTarget(release, available, currentVersion, siteBase, end === 'mobile' ? '/mobile/?scope=all#/orders' : release.routeSchema === 2 ? '/manage?scope=all' : '/dashboard?scope=all', undefined, scenario, false) }));
    function directoryLink(page: typeof pages[number]) {
        const params = new URLSearchParams({ version: release.id, scope: context.get('scope') === 'all' ? 'all' : 'version', page: page.key, scenario });
        if (page.platform === 'mobile' && page.after) return sitePath(`/rp/mobile?${params}`);
        if (page.changes[0]) params.set('change', page.changes[0].id);
        return sitePath(`/rp/versions?${params}`);
    }
    if (appearance === 'version') {
        return <><PrototypePageDirectory version={release.id} full={complete} filters={filters} scopeControls={scopeControls} entries={<div className="proto-actions">{fullTargets.map(target => target.url ? <PrototypeEntry key={target.end} kind={target.end === 'mobile' ? 'mobile' : 'manage'} to={target.url}>打开{target.end === 'mobile' ? '手机端' : '管理端'} →</PrototypeEntry> : <span key={target.end}>{target.end === 'mobile' ? '手机端' : '管理端'}：{snapshots.isPending ? '正在检查归档…' : target.reason}</span>)}</div>} feedback={<>{snapshots.isError && <p role="alert">历史索引读取失败，历史完整原型不可用。<button onClick={() => void snapshots.refetch()}>重试</button></p>}{complete && !product.complete && <p role="alert">完整页面清单尚不完整：{product.reason}</p>}</>} pages={pages.map(page => {
            const removed = !page.after;
            let path = removed ? page.before : page.after;
            if (complete && path) { const url = new URL(path, 'https://prototype.invalid'); url.searchParams.set('scope', 'all'); path = url.pathname + url.search + url.hash; }
            const target = previewTarget(removed ? releases.find(item => item.id === release.baseline) : release, available, currentVersion, siteBase, path, page.changes[0]?.id, scenario, false);
            return { id: page.pageId ?? page.key, title: page.title, path: page.after || page.before || '', module: [...groups].find(([, items]) => items.some(item => item.key === page.key))?.[0] ?? '未分组', changes: page.changes, removed, href: target.url, unavailable: snapshots.isPending ? '检查归档中…' : target.reason ?? '待登记构建', onDetails: () => setNotesPage(page.key) };
        })} /><ChangeNotesDrawer release={release} changes={pages.find(page => page.key === notesPage)?.changes || []} visible={notesPage !== null} onClose={() => setNotesPage(null)} technical={technical} scenario={scenario} /></>;
    }
    return <section className={embedded ? undefined : "proto-card"} aria-label="版本页面目录">
        <div className="proto-heading"><div className="proto-directory-heading">{!embedded && <div><h2>{release.id} · {complete ? '完整页面目录' : '页面目录'}</h2><p>{browse ? '按模块选择页面，直接体验交互。' : complete ? '继承基线全部有效页面，覆盖本版修改并移除删除项；未改动页面继续保留。' : '按业务模块阅读本版涉及的页面，页面关联稳定编号与 CHG；完整流程从此版本的完整原型进入。'}</p></div>}</div>
            <div className="proto-directory-links"><div className="proto-actions">{fullTargets.map((target) => target.url ? <a className="proto-open-button" key={target.end} href={target.url} target="_blank" rel="noreferrer">查看 {release.id} 完整{target.end === 'mobile' ? '手机端' : '管理端'}原型 ↗</a> : <span key={target.end}>{target.end === 'mobile' ? '手机端' : '管理端'}完整原型：{snapshots.isPending ? '正在检查归档…' : target.reason}</span>)}
                {!browse && !embedded && <a href={sitePath(`/rp/workflow?version=${release.id}`)}>版本说明与评审</a>}
            </div></div>
        </div>
        {(filters || scopeControls) && <div className="proto-directory-filters">{filters}{scopeControls}</div>}
        {!embedded && fullTargets.some((target) => target.url) && <p className="proto-muted">{fullTargets.some((target) => target.archived && target.url?.startsWith('/releases/')) ? '打开对应版本固定快照，保留当时完整菜单及交互。' : '当前版本使用工作构建，正式评审请使用固定候选。'}</p>}
        {snapshots.isError && <p role="alert">历史索引读取失败，历史完整原型不可用。<button onClick={() => void snapshots.refetch()}>重试</button></p>}
        {complete && !product.complete && <p role="alert">完整页面清单尚不完整：{product.reason}。实际页面仅从对应固定快照打开。</p>}
        {!pages.length && <p>本版未登记{platform === 'mobile' ? '手机端' : platform === 'manage' ? '管理端' : ''}改动页面；未改动页面请在完整原型中查看。</p>}
        <div className={browse ? "proto-directory-list" : "proto-guide-grid"}>{[...groups].map(([group, items]) => <div key={group}><h3>{group}</h3><ul className="proto-version-pages">{items.map((page) => {
            const removed = !page.after;
            let path = removed ? page.before : page.after;
            if (complete && path) { const url = new URL(path, 'https://prototype.invalid'); url.searchParams.set('scope', 'all'); path = url.pathname + url.search + url.hash; }
            const target = previewTarget(removed ? releases.find((item) => item.id === release.baseline) : release, available, currentVersion, siteBase, path, page.changes[0]?.id, scenario, false);
            return <li key={page.key}>{browse && target.url ? <a href={target.url} target="_blank" rel="noreferrer">{page.title} ↗</a> : page.changes.length ? <a href={directoryLink(page)}>{page.title}</a> : <strong>{page.title}</strong>}{removed && <strong> · 已删除</strong>}
                <p className="proto-muted">{technical ? <>{page.changes.length ? page.changes.map((change) => change.id).join(' / ') : '本版未改动 · 沿用基线'} · {page.pageId}</> : page.changes.length ? '本次有调整' : '本次未调整'}</p>
                <div className="proto-actions">{page.changes.length > 0 && (browse ? <Button size="small" aria-label={`查看 ${page.title} 改动说明`} onClick={() => setNotesPage(page.key)}>改动说明 · {page.changes.length}</Button> : <a href={directoryLink(page)}>{page.platform === 'mobile' && !removed ? '预览页面' : '查看改动说明'}</a>)}{target.url ? (!browse && <a href={target.url} target="_blank" rel="noreferrer">{removed ? '打开删除前页面' : '打开此版页面'} ↗</a>) : <span className="proto-muted">{snapshots.isPending ? '正在检查归档…' : target.reason}</span>}</div>
            </li>;
        })}</ul></div>)}</div>
        <ChangeNotesDrawer release={release} changes={pages.find((page) => page.key === notesPage)?.changes || []} visible={notesPage !== null} onClose={() => setNotesPage(null)} technical={technical} scenario={scenario} />
    </section>;
}
