import { ImagePlus } from 'lucide-react';
import { Button, Toast } from '@douyinfe/semi-ui';
import { useRef, useState } from 'react';
import { addReview, updateReview, reviewImages, type ReviewNote } from '@/mocks/prototype';
import { canReview, type Platform, type ProductPage, type Release } from './version-model';
import './review.css';

export function ReviewForm({ version, pages, noteField, initialNote, initialPage, onSaved }: {
    version: Release; pages: ProductPage[]; noteField?: React.RefObject<HTMLTextAreaElement | null>;
    initialNote?: ReviewNote; initialPage?: ProductPage; onSaved?: (note: ReviewNote) => void;
}) {
    const [author, setAuthor] = useState(initialNote?.author ?? '');
    const [text, setText] = useState(initialNote?.text ?? '');
    const [platform, setPlatform] = useState<Platform | ''>(initialNote?.platform ?? initialPage?.platform ?? '');
    const [pageId, setPageId] = useState(initialNote?.pageId ?? initialPage?.id ?? '');
    const [changeId, setChangeId] = useState(initialNote?.changeId ?? '');
    const [images, setImages] = useState<string[]>(initialNote ? reviewImages(initialNote) : []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInput = useRef<HTMLInputElement>(null);
    async function loadImages(files: File[]) {
        if (!files.length || loading) return;
        if (images.length + files.length > 6) { setError('最多添加6张截图'); return; }
        if (files.some(file => !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024)) { setError('请选择每张 1MB 以内的 PNG、JPEG 或 WebP 图片'); return; }
        setLoading(true); setError('');
        try {
            const added = await Promise.all(files.map(file => new Promise<string>((resolve, reject) => {
                const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('图片读取失败')); reader.onerror = () => reject(new Error('图片读取失败，请重试')); reader.readAsDataURL(file);
            })));
            setImages(previous => [...previous, ...added]);
        } catch (cause) { setError((cause as Error).message); }
        finally { setLoading(false); if (fileInput.current) fileInput.current.value = ''; }
    }
    return <form className="version-review-form" onPaste={event => { const files = [...event.clipboardData.items].filter(item => item.type.startsWith('image/')).flatMap(item => { const file = item.getAsFile(); return file ? [file] : []; }); if (files.length) { event.preventDefault(); void loadImages(files); } }} onSubmit={event => {
        event.preventDefault();
        if (loading) return;
        try {
            const data = { author, text, pageId, ...(platform && pageId ? { platform } : {}), ...(changeId ? { changeId } : {}), images };
            const saved = initialNote ? updateReview(version.id, initialNote.id, data) : addReview(version.id, data);
            setError(''); Toast.success('评审记录已保存到当前浏览器');
            if (onSaved) onSaved(saved); else { setText(''); setImages([]); }
        } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请检查浏览器空间'); }
    }}><p className="review-context">版本：{version.id} · {version.title}</p>{initialPage && <p className="review-context">页面：{initialPage.title}</p>}
        <div className="version-form-grid"><label className="review-author">记录人<span className="review-required" aria-hidden="true">*</span><input aria-label="记录人" required value={author} maxLength={50} onChange={event => setAuthor(event.target.value)} placeholder="填写姓名" /></label>
        {!initialPage && <><label>关联端<select value={platform} onChange={event => { setPlatform(event.target.value as Platform | ''); setPageId(''); setChangeId(''); }}><option value="">版本整体</option><option value="manage">管理端</option><option value="mobile">手机端</option></select></label><label>关联页面<select value={pageId} disabled={!platform} onChange={event => { setPageId(event.target.value); setChangeId(''); }}><option value="">版本整体</option>{pages.filter(page => page.platform === platform).map(page => <option key={page.id} value={page.id}>{page.module} / {page.title}</option>)}</select></label></>}
        <label>关联改动<select aria-label="关联改动" value={changeId} disabled={!pageId} onChange={event => setChangeId(event.target.value)}><option value="">不关联具体改动</option>{version.changes.filter(change => change.pageId === pageId && (change.platform ?? 'manage') === platform).map(change => <option key={change.id} value={change.id}>{change.id} · {change.title}</option>)}</select></label>
        <textarea className="version-field-wide review-description" aria-label="评审意见" ref={noteField} required value={text} maxLength={5000} rows={4} placeholder="填写说明，也可直接粘贴截图" onChange={event => setText(event.target.value)} /></div>
        <div className="review-upload-area" tabIndex={0} aria-label="截图上传或粘贴区域"><ImagePlus size={22} aria-hidden="true" /><Button theme="borderless" disabled={loading || images.length >= 6} onClick={() => fileInput.current?.click()}>{loading ? '正在读取截图…' : '上传截图'}</Button><span>可直接粘贴图片 · 最多6张，每张1MB</span><input ref={fileInput} type="file" aria-label="添加评审截图" className="review-file-input" multiple accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={event => { void loadImages([...(event.target.files ?? [])]); }} /></div>
        <div className="review-images">{images.map((image, index) => <figure key={index}><a href={image} target="_blank" rel="noreferrer"><img src={image} alt={'评审截图 ' + (index + 1)} /></a><Button size="small" theme="borderless" disabled={loading} onClick={() => setImages(previous => previous.filter((_, i) => i !== index))}>移除截图 {index + 1}</Button></figure>)}</div>
        <div className="review-form-actions"><Button htmlType="submit" theme="solid" disabled={loading || !canReview(version)}>{initialNote ? '保存修改' : '保存评审备注'}</Button></div>
        {error && <p className="version-errors" role="alert">{error}</p>}
    </form>;
}
