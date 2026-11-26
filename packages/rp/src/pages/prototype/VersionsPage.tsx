import { VersionOverview } from '@weiran-tech/prototype';
import { useRef, useState } from 'react';
import { Button, Modal, RadioGroup, Tag } from '@douyinfe/semi-ui';
import { PortalLink } from '@/prototype/PortalRouter';
import { releases as originalReleases, currentVersion, sitePath, pageDiffs } from '@/prototype/catalog';
import { pagesForReview } from '@/prototype/management-catalog';
import { useVersionParams } from '@/prototype/useVersionParams';
import { useVersions } from '@/prototype/useVersions';
import { VersionPageDirectory } from '@/prototype/VersionPageDirectory';
import { ReviewForm } from '@/prototype/ReviewForm';
import { exportVersion } from '@/prototype/export';
import { canReview, statusLabels } from '@/prototype/version-model';
import { reviewImages, type ReviewNote } from '@/mocks/prototype';
import '@/prototype/prototype.css';
import '@/prototype/review.css';
import '@/prototype/versions.css';

export default function VersionsPage() {
    const [params, setParams] = useVersionParams();
    const { releases, notes } = useVersions();
    const version = params.get('version') || currentVersion;
    const release = releases.find(item => item.id === version);
    const original = originalReleases.find(item => item.id === version);
    const prototypeTab = useRef<HTMLButtonElement>(null);
    const reviewTab = useRef<HTMLButtonElement>(null);
    const [editing, setEditing] = useState<ReviewNote | null>(null);
    const tab = params.get('tab') === 'review' ? 'review' : 'prototype';
    const platform = params.get('platform') === 'mobile' ? 'mobile' : params.get('platform') === 'manage' ? 'manage' : undefined;
    const update = (patch: Record<string, string>) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([key, value]) => next.set(key, value)); setParams(next); };
    if (!release || !original) return <div className="proto-page"><h1>版本不存在</h1><PortalLink href="/versions">返回版本清单</PortalLink></div>;
    const pages = pagesForReview(release);
    const entries = notes[version] ?? [];
    const reviewOpen = canReview(release);
    return <div className="proto-page prototype-scope version-detail">
        <header className="proto-heading version-detail-heading"><div><Tag color="blue">{statusLabels[release.status]}</Tag><h1>{release.id} · {release.title}</h1><p className="proto-muted">{release.goal}</p></div></header>
        <VersionOverview baseline={release.baseline ? <PortalLink href={sitePath('/rp/versions', release.baseline)}>{release.baseline}</PortalLink> : <strong>初始基线</strong>} date={release.date} pages={pageDiffs(original).length} changes={release.changes.length} />
        <div className="version-tabs" role="tablist" aria-label="版本内容" onKeyDown={event => {
            if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
            event.preventDefault();
            const next = event.key === 'Home' ? 'prototype' : event.key === 'End' ? 'review' : tab === 'prototype' ? 'review' : 'prototype';
            update({ tab: next }); (next === 'prototype' ? prototypeTab : reviewTab).current?.focus();
        }}><button ref={prototypeTab} id="version-prototype-tab" role="tab" aria-controls="version-prototype-panel" tabIndex={tab === 'prototype' ? 0 : -1} aria-selected={tab === 'prototype'} onClick={() => update({ tab: 'prototype' })}>原型与改动</button><button ref={reviewTab} id="version-review-tab" role="tab" aria-controls="version-review-panel" tabIndex={tab === 'review' ? 0 : -1} aria-selected={tab === 'review'} onClick={() => update({ tab: 'review' })}>评审记录 · <span>{entries.length}</span></button></div>
        {tab === 'prototype' ? <section className="proto-card" id="version-prototype-panel" role="tabpanel" aria-labelledby="version-prototype-tab"><VersionPageDirectory key={`${version}:${platform ?? 'all'}:${params.get('scope') ?? 'all'}:${params.get('change') ?? ''}`} release={original} {...(platform ? { platform } : {})} full={params.get('scope') !== 'version'} browse technical embedded appearance="version" filters={<RadioGroup aria-label="选择端" type="button" value={platform ?? 'all'} options={[{ value: 'all', label: '全部' }, { value: 'manage', label: '管理端' }, { value: 'mobile', label: '手机端' }]} onChange={event => update({ platform: String(event.target.value) })} />} scopeControls={<div className="version-segments" aria-label="目录范围"><button onClick={() => update({ scope: 'all' })} aria-pressed={params.get('scope') !== 'version'}>完整产品</button><button onClick={() => update({ scope: 'version' })} aria-pressed={params.get('scope') === 'version'}>本版改动</button></div>} /></section>
            : <section className="proto-card" id="version-review-panel" role="tabpanel" aria-labelledby="version-review-tab"><div className="proto-heading"><div><h2>{reviewOpen ? '版本评审' : '评审记录（只读）'}</h2><p className="proto-muted">{reviewOpen ? '记录仅保存在当前浏览器，可关联页面、CHG 并附截图。' : '已完结版本不接受新增和编辑评审，已有本机记录可查看和导出。'}</p></div><div className="proto-actions"><Button onClick={() => exportVersion(release, pages, entries, 'html')}>导出 HTML / 打印 PDF</Button><Button onClick={() => exportVersion(release, pages, entries, 'json')}>导出 JSON</Button></div></div>
                {reviewOpen && <ReviewForm key={version} version={release} pages={pages} />}
                {!entries.length && <p className="proto-muted">暂无本机评审记录</p>}
                {[...entries].reverse().map(note => <article className="proto-card" key={note.id}><div className="proto-actions"><strong>{note.author}</strong><Tag>{note.pageTitle ?? '版本整体'}</Tag>{note.changeId && <Tag>{note.changeId}</Tag>}<small>{new Date(note.updatedAt ?? note.date).toLocaleString()}</small></div><p style={{ whiteSpace: 'pre-wrap' }}>{note.text}</p><div className="review-images">{reviewImages(note).map((image, index) => <a key={index} href={image} target="_blank" rel="noreferrer"><img src={image} alt={`评审截图 ${index + 1}`} /></a>)}</div>{reviewOpen && <Button onClick={() => setEditing(note)}>编辑评审记录</Button>}</article>)}
            </section>}
        <section className="proto-card"><h2>源码维护版本</h2><p>通过 AI 对话登记版本、页面和 CHG，完结后冻结实现。网页不创建或编辑版本，不连接 GitHub 提交评审。</p><PortalLink href={sitePath('/help/versions')}>查看版本维护指南 →</PortalLink></section>
        <Modal title="编辑评审记录" visible={Boolean(editing) && reviewOpen} footer={null} onCancel={() => setEditing(null)} destroyOnClose>{editing && <ReviewForm key={editing.id} version={release} pages={pages} initialNote={editing} onSaved={() => setEditing(null)} onDeleted={() => setEditing(null)} />}</Modal>
    </div>;
}
