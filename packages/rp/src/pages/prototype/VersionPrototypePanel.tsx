import PrototypeCatalogPage from './PrototypeCatalogPage';
import { PageConflictNotice } from '@/prototype/PageConflictNotice';
import { Button, Tag } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useVersionParams } from '@/prototype/useVersionParams';
import { CandidatePanel } from '@/prototype/CandidatePanel';
import { ReviewLinks } from '@/prototype/ReviewLinks';
import { ChangeNotesDrawer } from '@/prototype/ChangeNotesDrawer';
import { currentRelease, currentVersion, pageDiffs, previewTarget, productFor, releases, siteBase, sitePath, statusLabels, typeLabels } from '@/prototype/catalog';
import '@/prototype/prototype.css';
import { useSnapshots } from '@/prototype/useSnapshots';

export default function VersionPrototypePanel({ embedded = false, withCatalog = false }: { embedded?: boolean; withCatalog?: boolean } = {}) {
    const [params, setParams] = useVersionParams();
    const requestedVersion = params.get('version');
    const release = releases.find((item) => item.id === requestedVersion) ?? currentRelease;
    const selectedChange = params.get('change');
    const [notesOpen, setNotesOpen] = useState(false);
    const [platform, setPlatform] = useState('all');
    const [kind, setKind] = useState('all');
    const [technical, setTechnical] = useState(false);
    const changes = release.changes.filter((change) => (platform === 'all' || change.platform === platform) && (kind === 'all' || change.type === kind));
    const pages = pageDiffs(release);
    const selectedPage = pages.find((item) => item.key === params.get('page') && item.changes.some((change) => changes.includes(change))) ?? pages.find((item) => item.changes.some((change) => changes.includes(change) && change.id === selectedChange)) ?? pages.find((item) => item.changes.some((change) => change === changes[0]));
    const scenario = ['normal', 'empty', 'failure'].includes(params.get('scenario') || '') ? params.get('scenario')! : 'normal';
    const snapshots = useSnapshots();
    const available = snapshots.data ?? [];
    const visibleChange = changes.find((change) => change.id === selectedChange) ?? changes.find((change) => selectedPage?.changes.some((entry) => entry.id === change.id)) ?? changes[0];
    const snapshot = available.find((item) => item.version === release.id);
    const source = snapshot?.commit || release.sourceCommit;
    const archiveState = snapshot?.kind === 'working' ? '版本隔离工作构建' : snapshot ? '快照可用' : release.status === 'finalized' ? '已定稿 · 待归档' : release.id === currentVersion ? '当前可交互构建' : '尚无快照';
    const mobilePage = productFor(release.id).pages.find((item) => item.platform === 'mobile' && item.pageId !== 'mobile-form');
    const mobileTarget = previewTarget(release, available, currentVersion, siteBase, mobilePage?.path || null, undefined, scenario, false);
    const changeNavigation = <nav className="proto-page-nav" aria-label="选择改动">{changes.map((change) => <button key={change.id} aria-pressed={change === visibleChange} onClick={() => { setNotesOpen(true); const next = new URLSearchParams(params); next.set('change', change.id); const page = pages.find((entry) => entry.changes.some((item) => item.id === change.id)); if (page) next.set('page', page.key); setParams(next); }}>{technical ? `${change.id} · ` : ''}{change.title}</button>)}</nav>;
    const changeDrawer = <ChangeNotesDrawer release={release} changes={visibleChange ? [visibleChange] : []} visible={notesOpen || Boolean(selectedChange)} onClose={() => { setNotesOpen(false); const next = new URLSearchParams(params); next.delete('change'); if (selectedPage) next.set('page', selectedPage.key); setParams(next); }} technical={technical} scenario={scenario} />;
    return <div className={embedded ? "proto-version-panel" : "proto-page"}>{!embedded && <header className="proto-heading"><div><div className="proto-eyebrow">PROTOTYPE WORKSPACE</div><h1>版本中心</h1><p className="proto-muted">看本次改动，操作原型，阅读改动说明。</p></div><div className="proto-actions"><label>查看说明 <select aria-label="查看版本" value={release.id} onChange={(event) => setParams({ version: event.target.value })}>{releases.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label><a href={sitePath(`/rp/workflow?version=${release.id}`)}>产品与研发交接</a><a href={sitePath('/rp/editor')}>编辑版本记录</a></div></header>}
        {requestedVersion && requestedVersion !== release.id && <p role="alert" className="proto-validation">找不到版本 {requestedVersion}，当前显示 {release.id}，请重新选择版本。</p>}
        {!embedded && <CandidatePanel version={release.id} />}{!embedded && <section className="proto-card"><div className="proto-heading"><h2>{release.id} · {release.title}</h2><div className="proto-actions"><Tag>{statusLabels[release.status]}</Tag><Tag color={snapshot ? 'green' : 'blue'}>{archiveState}</Tag></div></div><p>{release.goal}</p>{release.supersededBy && <p className="proto-validation">本版由 <a href={sitePath(`/rp/versions`, release.supersededBy)}>{release.supersededBy}</a> 承接；历史记录和原型访问继续保留。</p>}<p className="proto-muted">{release.date} · 基线 {release.baseline ?? '无'} · 源码 {source || (release.status === 'finalized' ? '归档后显示准确提交' : '开发中，尚未定稿')}</p><ReviewLinks context={{ version: release.id, baseline: release.baseline }} /><p className="proto-muted">运行构建：{currentVersion}。历史入口仅使用对应快照；切换说明不会替换当前代码。</p><div className="proto-actions">{mobileTarget.url ? <a href={mobileTarget.url} target="_blank" rel="noreferrer">查看 {release.id} 手机端 ↗</a> : <span>手机端：{mobileTarget.reason}</span>}<a href={sitePath('/help/review')}>产品填写指南</a><Button onClick={() => { const blob = new Blob([JSON.stringify(release, null, 2)], { type: 'application/json' }); const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `${release.id}.json`; link.click(); URL.revokeObjectURL(url); }}>导出本版说明</Button></div></section>}

        {withCatalog ? <><PrototypeCatalogPage embedded technical={technical} /><section className="proto-card"><div className="proto-actions"><Button aria-pressed={technical} onClick={() => setTechnical((value) => !value)}>{technical ? '隐藏技术信息' : '显示技术信息'}</Button></div><details><summary>本版改动记录 · {changes.length}</summary>            {changeNavigation}</details>            {changeDrawer}</section></> : <>        <section className="proto-card"><div className="proto-heading"><h2>本次改动 <Tag>{changes.length}</Tag></h2><div className="proto-actions"><Button aria-pressed={technical} onClick={() => setTechnical((value) => !value)}>{technical ? '隐藏技术信息' : '显示技术信息'}</Button></div></div><div className="proto-filters"><label>适用端 <select value={platform} onChange={(event) => setPlatform(event.target.value)}><option value="all">全部</option><option value="manage">管理端</option><option value="mobile">手机端</option></select></label><label>改动类型 <select value={kind} onChange={(event) => setKind(event.target.value)}><option value="all">全部</option>{Object.entries(typeLabels).map(([value, title]) => <option key={value} value={value}>{title}</option>)}</select></label></div>
            {!changes.length && <div className="proto-empty">此条件下没有登记改动。</div>}
            {changeNavigation}
            {visibleChange && <Button onClick={() => setNotesOpen(true)}>查看改动说明</Button>}
            {changeDrawer}
        </section>
</>}
        <PageConflictNotice release={release} />
    </div>;
}
