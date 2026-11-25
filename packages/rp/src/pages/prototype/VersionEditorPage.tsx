import { canDerive, workErrors } from '../../../prototype/version-work.mjs';
import resolutions from '../../../prototype/conflict-resolutions.json';
import { PageConflictNotice } from '@/prototype/PageConflictNotice';
import { useWorkspaceNavigate } from '@/prototype/navigation';
import { useLocation } from 'react-router-dom';
import { Button, Toast } from '@douyinfe/semi-ui';
import { useEffect, useState } from 'react';
import { blankRelease, immutableErrors, validateCatalog, type Catalog, type Release } from '../../../prototype/model.mjs';
import { ChangeDetails } from '@/prototype/ChangeDetails';
import { equal } from '../../../prototype/transfer.mjs';
import source from '../../../prototype/releases.json';
import { sitePath, statusLabels } from '@/prototype/catalog';
import { repository } from '../../../prototype/project.mjs';
import { reviewReference } from '../../../prototype/review-source.mjs';
import { handoffIssueUrl } from '../../../prototype/handoff.mjs';
import '@/prototype/prototype.css';
import { navigatePortal } from '@/prototype/PortalRouter';
import { routeVersion } from '@/prototype/runtime';

const key = 'prototype_editor_draft_v2';
const original: Catalog = source;
function draftShape(value: unknown): value is Catalog {
    if (!value || typeof value !== 'object') return false;
    const catalog = value as Record<string, unknown>;
    if (typeof catalog.current !== 'string' || !Array.isArray(catalog.releases)) return false;
    return catalog.releases.every((item: unknown) => {
        if (!item || typeof item !== 'object') return false;
        const release = item as Record<string, unknown>;
        return ['id', 'title', 'status', 'date', 'goal'].every((field) => typeof release[field] === 'string')
            && (release.baseline === null || typeof release.baseline === 'string')
            && (release.sourceCommit === null || typeof release.sourceCommit === 'string')
            && Array.isArray(release.changes) && release.changes.every((entry: unknown) => {
                if (!entry || typeof entry !== 'object') return false;
                const change = entry as Record<string, unknown>;
                return ['id', 'type', 'title', 'platform', 'page', 'location', 'before', 'after', 'exceptions'].every((field) => typeof change[field] === 'string')
                    && ['rules', 'acceptance'].every((field) => Array.isArray(change[field]) && change[field].every((line: unknown) => typeof line === 'string'))
                    && ['pageId', 'pageTitle', 'previousPage', 'nextPage'].every((field) => change[field] === undefined || change[field] === null || typeof change[field] === 'string');
            });
    });
}
function readSaved() { try { return JSON.parse(localStorage.getItem(key) || 'null') as { catalog: Catalog; base: Catalog; selected?: string } | null; } catch { return null; } }
function loadDraft(): Catalog {
    const saved = readSaved();
    if (saved && equal(saved.base, original) && draftShape(saved.catalog) && !immutableErrors(original, saved.catalog).length) {
        const catalog = { ...saved.catalog, releases: saved.catalog.releases.map((release) => ({ ...release, changes: structuredClone(original.releases.find((item) => item.id === release.id)?.changes || []) })) };
        if (!equal(catalog, saved.catalog)) localStorage.setItem(`${key}_changes_backup_${Date.now()}`, JSON.stringify(saved));
        return catalog;
    }
    return structuredClone(original);
}
function appendVersion(catalog: Catalog): Catalog {
    const baseline = catalog.releases.find((item) => canDerive(item) && canDerive(original.releases.find((source) => source.id === item.id)));
    if (!baseline) throw new Error('没有完成评审并定稿的版本，不能创建派生版本');
    const blocked = workErrors(baseline, catalog.releases, resolutions);
    if (blocked.length) throw new Error(blocked.join('；'));
    let index = 1;
    while (catalog.releases.some((item) => item.id === `v0.${index}`)) index++;
    const next = { ...blankRelease(`v0.${index}`, baseline.id), changes: [] };
    return { current: next.id, releases: [next, ...catalog.releases] };
}
function oldDrafts() {
    const saved = readSaved();
    if (saved) return equal(saved.base, original) ? [] : [{ key, value: saved.catalog, base: saved.base }];
    return Object.keys(localStorage).filter((name) => /^prototype_editor_v/.test(name)).flatMap((name) => { try { const value: unknown = JSON.parse(localStorage.getItem(name) || 'null'); return draftShape(value) ? [{ key: name, value, base: undefined }] : []; } catch { return []; } });
}
function TextField({ label, value, onChange, multiline = false, disabled = false }: { label: string; value: string; onChange: (value: string) => void; multiline?: boolean; disabled?: boolean }) {
    return <label className="proto-field"><span>{label}</span>{multiline ? <textarea rows={3} value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} /> : <input value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} />}</label>;
}
export default function VersionEditorPage() {
    return <VersionEditor key={routeVersion || 'global'} />;
}
function VersionEditor() {
    const location = useLocation();
    const navigate = useWorkspaceNavigate();
    const creating = new URLSearchParams(location.search).get('create') === '1';
    const [catalog, setCatalog] = useState(() => creating ? appendVersion(loadDraft()) : loadDraft());
    const [selected, setSelected] = useState(() => creating ? catalog.current : routeVersion || (catalog.releases.some((item) => item.id === readSaved()?.selected) ? readSaved()!.selected! : catalog.current));
    useEffect(() => { if (!creating) return; const next = new URLSearchParams(location.search); next.delete('create'); void navigate({ pathname: location.pathname, search: next.toString() }, { replace: true }); }, [creating, location.pathname, location.search, navigate]);
    const [preview, setPreview] = useState(false);
    const [errors, setErrors] = useState<string[]>([]);
    const [message, setMessage] = useState('');
    const [old, setOld] = useState(oldDrafts);
    const release = catalog.releases.find((item) => item.id === selected) ?? catalog.releases[0]!;
    const blocked = workErrors(release, catalog.releases, resolutions);
    const locked = blocked.length > 0 || Boolean(release.supersededBy) || original.releases.some((item) => item.id === release.id && ['finalized', 'baseline'].includes(item.status));
    useEffect(() => { if (old.length) return; try { localStorage.setItem(key, JSON.stringify({ catalog, base: original, selected })); } catch { Toast.warning('本机草稿保存失败，请检查浏览器存储空间。'); } }, [catalog, old.length, selected]);
    function update(patch: Partial<Release>) { setCatalog((previous) => ({ ...previous, releases: previous.releases.map((item) => item.id === release.id ? { ...item, ...patch } : item) })); setErrors([]); }
    function createVersion() {
        if (blocked.length) { setErrors(blocked); return; }
        const next = appendVersion(catalog);
        setCatalog(next); setSelected(next.current); setErrors([]); setMessage('新版本已建成本机草稿；版本信息需通过源码提交后才会共享。');
    }
    function check() { const result = [...validateCatalog(catalog), ...immutableErrors(original, catalog)]; setErrors(result); setMessage(result.length ? '' : '检查通过，版本信息仍为本机草稿，需通过源码提交仓库。'); return result; }
    return <div className="proto-page"><header className="proto-heading"><div><h1>版本记录</h1><p className="proto-muted">维护版本目标、基线和日期。改动记录随源码提交，版本信息通过源码提交后才会共享。</p></div><div className="proto-actions"><a href="/versions">返回版本清单</a><Button onClick={createVersion}>新建版本</Button><Button onClick={check}>检查说明</Button><Button onClick={() => setPreview((value) => !value)}>{preview ? '返回填写' : '预览说明'}</Button></div></header>
        <details className="proto-card"><summary>版本维护</summary><p>{release.supersededBy ? `本版已由 ${release.supersededBy} 承接，历史说明只读。` : '页面通过源码制作；版本说明保存在 prototype/releases.json，由维护者与页面代码一起提交。'}</p><div className="proto-actions">{(!release.supersededBy || reviewReference(release.id)) && <a href={reviewReference(release.id)?.url || handoffIssueUrl(repository, release)} target="_blank" rel="noreferrer">{reviewReference(release.id) ? '查看版本评审记录' : '创建版本 Discussion'} ↗</a>}</div>{!release.supersededBy && <p>登记评审：<code>pnpm version:review -- {release.id} discussion:&lt;编号&gt;</code></p>}</details>
        {old.length > 0 && <section className="proto-card"><h2>发现旧版本或过期草稿</h2><p>仓库说明已变化，当前显示仓库版本。旧草稿保留在本机，不会自动覆盖。</p><Button onClick={() => { localStorage.setItem(`${key}_backup_${Date.now()}`, JSON.stringify(old)); setOld([]); }}>保留旧草稿并使用仓库说明</Button></section>}
        <section className="proto-card"><div className="proto-actions"><label>编辑版本 <select aria-label="编辑版本" value={release.id} disabled={original.releases.some((item) => item.id === release.id)} onChange={(event) => { if (routeVersion && original.releases.some((item) => item.id === event.target.value)) { const target = sitePath('/rp/editor', event.target.value); if (!navigatePortal(target)) window.location.assign(target); return; } setSelected(event.target.value); setErrors([]); }}>{catalog.releases.map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title || '未填写标题'} · {statusLabels[item.status]}</option>)}</select></label></div>
            {routeVersion && release.id !== routeVersion && <p role="status">正在编辑尚未发布的本机草稿 {release.id}；提交并发布后才会获得团队访问路径。</p>}
            <p className="proto-muted">草稿自动保存在本机，尚未共享。由维护者通过 AI 编程工具同步到 prototype/releases.json，并与页面代码一起提交。</p>
            {message && <p role="status">{message}</p>}{errors.length > 0 && <div className="proto-validation" role="alert"><strong>请先处理以下内容</strong><ul>{errors.map((error, index) => <li key={index}>{error}</li>)}</ul></div>}
        </section>
        {blocked.length > 0 && <p role="alert">{blocked.join('；')}。请先解决后再工作。</p>}
        <PageConflictNotice release={release} catalog={catalog.releases} />
        {preview ? <section className="proto-card"><h2>{release.id} · {release.title || '未填写标题'}</h2><p>{release.goal}</p>{release.changes.map((change, index) => <ChangeDetails key={index} change={change} anchorId={`editor-${change.id}`} />)}</section> : <div className="proto-fieldset"><fieldset disabled={locked} className="proto-fieldset"><section className="proto-card"><h2>版本目标 {locked && '· 只读'}</h2><div className="proto-form-grid">
            <TextField label="版本标题" value={release.title} onChange={(value) => update({ title: value })} />
            <TextField label="版本目标" value={release.goal} multiline onChange={(value) => update({ goal: value })} />
            <details><summary>版本设置</summary>            <TextField label="版本编号" value={release.id} disabled={original.releases.some((item) => item.id === release.id)} onChange={(value) => { const old = release.id; setCatalog((previous) => ({ ...previous, current: previous.current === old ? value : previous.current, releases: previous.releases.map((item) => item === release ? { ...item, id: value } : item) })); setSelected(value); }} />
            <label className="proto-field"><span>评审状态</span><select value={release.status} onChange={(event) => update({ status: event.target.value })}><option value="draft">草稿</option><option value="review">待评审</option><option value="finalized" disabled>已定稿（需 GitHub 批准与发布门禁）</option>{release.status === 'baseline' && <option value="baseline">源码基线</option>}</select></label>
            <label className="proto-field"><span>版本基线</span><select value={release.baseline || ''} onChange={(event) => update({ baseline: event.target.value || null })}><option value="">无基线</option>{catalog.releases.filter((item) => item.id !== release.id && canDerive(item) && canDerive(original.releases.find((source) => source.id === item.id))).map((item) => <option key={item.id} value={item.id}>{item.id} · {item.title}</option>)}</select></label>
            <TextField label="说明日期（YYYY-MM-DD）" value={release.date} onChange={(value) => update({ date: value })} />
            </details>
        </div></section></fieldset>
        <section className="proto-card"><h2>改动记录 · 只读</h2><p>改动记录随源码维护，站内不提供新增、修改或删除。请通过 AI 编程工具同步页面、Mock 和 prototype/releases.json，再提交仓库。</p><p>本版已登记 {release.changes.length} 项改动。</p></section></div>}

    </div>;
}
