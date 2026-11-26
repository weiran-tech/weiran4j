import type { ReviewNote, ReviewStore } from './reviews';
import type { ReviewAuthorStore } from './authors';
import { Button, Modal } from '@douyinfe/semi-ui';
import { MessageSquarePlus, ClipboardList } from 'lucide-react';
import { useEffect, useState } from 'react';
import { canReview, type CatalogPage, type ProductPage, type Release } from './model';
import { RpReviewForm } from './RpReviewForm';
import './review.css';
import './versions.css';

export function RpPageReview({ release, page, pages, notes, actions, authorsStore, locked = false, reviewPath }: {
    release: Release; page?: CatalogPage; pages: ProductPage[]; notes: ReviewNote[];
    actions: ReviewStore; authorsStore: ReviewAuthorStore; locked?: boolean; reviewPath: string;
}) {
    const versionId = release.id;
    const platform = page?.platform;
    const [visible, setVisible] = useState(false);
    const [editing, setEditing] = useState<ReviewNote | null>(null);
    const [showRecords, setShowRecords] = useState(false);
    useEffect(() => {
        if (!release || !page || (platform === 'manage' && locked)) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'j' && !event.isComposing) {
                event.preventDefault();
                setEditing(null); setVisible(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [release, page, platform, locked]);
    if (!release || !page) return null;
    const eligible = pages.find(item => item.id === page.id && item.platform === platform);
    const writable = canReview(release) && Boolean(eligible);
    const versionNotes = notes;
    if (locked) return null;
    return <div className="prototype-scope page-review-launcher">{showRecords && <section className="page-review-records" aria-label="本版本评审记录"><header><strong>{versionId} 评审记录</strong><span>{versionNotes.length} 条</span></header><div className="page-review-records-scroll">{!versionNotes.length && <p className="proto-muted">暂无评审记录</p>}{[...versionNotes].reverse().map(note => <button type="button" key={note.id} className="page-review-record" onClick={() => { setEditing(note); setVisible(true); }}><strong>{note.pageTitle ?? pages.find(item => item.id === note.pageId)?.title ?? '版本整体'}</strong><small>{note.author} · {new Date(note.date).toLocaleString()}</small><span>{note.text}</span></button>)}</div><a href={reviewPath}>查看评审记录 →</a></section>}<Button className="page-review-records-toggle" aria-label="评审记录" title={`评审记录 · ${versionNotes.length}`} icon={<ClipboardList size={19} />} aria-expanded={showRecords} onClick={() => setShowRecords(!showRecords)} /><Button theme="solid" aria-label="新增评审" title="新增评审（⌘ J）" aria-keyshortcuts="Meta+J" icon={<MessageSquarePlus size={19} />} onClick={() => { setEditing(null); setVisible(true); }} />
        <Modal className="prototype-scope" title="页面评审" visible={visible} footer={null} width="min(680px, calc(100vw - 32px))" onCancel={() => setVisible(false)} destroyOnClose>
            <div className="review-modal-heading"><span>{versionId} · {editing ? editing.pageTitle ?? "版本整体" : page.title}</span></div>
            {editing ? canReview(release) ? <RpReviewForm key={editing.id} actions={actions} authorsStore={authorsStore} version={release} pages={pages} initialNote={editing} onSaved={() => setVisible(false)} onDeleted={() => { setVisible(false); setEditing(null); }} /> : <div className="page-review-readonly"><strong>{editing.author}</strong><p>{editing.text}</p>{(editing.images ?? (editing.image ? [editing.image] : [])).map((image, index) => <img key={index} src={image} alt={'评审截图 ' + (index + 1)} />)}</div> : writable && eligible ? <RpReviewForm key={versionId + ':' + page.id} actions={actions} authorsStore={authorsStore} version={release} pages={pages} initialPage={eligible} onSaved={() => setVisible(false)} /> : <p className="version-notice">{canReview(release) ? '该页面未收录于所选版本，无法新增评审。' : '仅进行中版本允许新增和编辑；当前版本可查看已有评审记录。'}</p>}
            <p className="review-local-hint">记录和截图仅保存在当前浏览器，可到版本评审页再次编辑或导出。</p>
        </Modal>
    </div>;
}
