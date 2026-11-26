import type { FormApi } from '@douyinfe/semi-ui/lib/es/form';
import type { ReviewAuthorStore } from './authors';
import { ImagePlus, X } from 'lucide-react';
import { Button, Form, Toast } from '@douyinfe/semi-ui';
import { useRef, useState } from 'react';
import { reviewImages, type ReviewNote, type ReviewStore } from './reviews';
import { canReview, type Platform, type ProductPage, type Release } from './model';
import './review.css';

export function RpReviewForm({ version, pages, initialNote, initialPage, onSaved, onDeleted, actions, authorsStore }: {
    version: Release; pages: ProductPage[]; actions: Pick<ReviewStore, 'addReview' | 'updateReview' | 'deleteReview'>; authorsStore: ReviewAuthorStore;
    initialNote?: ReviewNote; initialPage?: ProductPage; onSaved?: (note: ReviewNote) => void; onDeleted?: () => void;
}) {
    const { addReview, updateReview, deleteReview } = actions;
    const { readReviewAuthors, rememberReviewAuthor } = authorsStore;
    const [authors, setAuthors] = useState(readReviewAuthors);
    const api = useRef<FormApi<{ author: string; text: string; platform: Platform | ''; pageId: string }> | null>(null);
    const [platform, setPlatform] = useState<Platform | ''>(initialNote?.platform ?? initialPage?.platform ?? '');
    const [changeId, setChangeId] = useState(initialNote?.changeId ?? '');
    const [images, setImages] = useState<string[]>(initialNote ? reviewImages(initialNote) : []);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInput = useRef<HTMLInputElement>(null);
    function remember(name: string) {
        if (!name.trim() || name.trim().length > 50) return;
        try { setAuthors(rememberReviewAuthor(name)); }
        catch { Toast.warning('建议人偏好未能保存到本机，请检查浏览器存储空间'); }
    }
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
    return <Form className="prototype-scope version-review-form" initValues={{ author: initialNote?.author ?? authors.lastUsed, text: initialNote?.text ?? '', platform, pageId: initialNote?.pageId ?? initialPage?.id ?? '' }} getFormApi={value => { api.current = value; }} onPaste={event => { const files = [...event.clipboardData.items].filter(item => item.type.startsWith('image/')).flatMap(item => { const file = item.getAsFile(); return file ? [file] : []; }); if (files.length) { event.preventDefault(); void loadImages(files); } }} onSubmit={values => {
        if (loading) return;
        try {
            const { author, text, platform: selectedPlatform } = values;
            const pageId = typeof values.pageId === 'string' ? values.pageId : '';
            const data = { author, text, pageId, ...(selectedPlatform && pageId ? { platform: selectedPlatform } : {}), ...(changeId ? { changeId } : {}), images };
            const saved = initialNote ? updateReview(version.id, initialNote.id, data) : addReview(version.id, data);
            remember(saved.author);
            setError(''); Toast.success('评审记录已保存到当前浏览器');
            if (onSaved) onSaved(saved); else { api.current?.setValue('text', ''); setImages([]); }
        } catch (cause) { setError(cause instanceof Error ? cause.message : '保存失败，请检查浏览器空间'); }
    }}><p className="review-context">版本：{version.id} · {version.title}</p>{initialPage && <p className="review-context">页面：{initialPage.title}</p>}
        <Form.TextArea field="text" noLabel aria-label="评审意见" maxLength={5000} rows={3} placeholder="填写说明，也可直接粘贴截图" rules={[{ required: true, message: '请填写评审说明' }, { pattern: /\S/, message: '评审说明不能为空' }]} />
        <div className="review-upload-area review-upload-compact" tabIndex={0} aria-label="截图上传或粘贴区域">
            <div className="review-screenshot-grid">{images.map((image, index) => <figure key={index}><a href={image} target="_blank" rel="noreferrer"><img src={image} alt={'评审截图 ' + (index + 1)} /></a><Button className="review-screenshot-remove" aria-label={'移除截图 ' + (index + 1)} icon={<X size={12} />} size="small" theme="solid" type="tertiary" disabled={loading} onClick={() => setImages(previous => previous.filter((_, i) => i !== index))} /></figure>)}{images.length < 6 && <Button className="review-screenshot-add" aria-label="上传截图" theme="borderless" disabled={loading} onClick={() => fileInput.current?.click()}><ImagePlus size={20} /><span>{loading ? '读取中…' : '上传'}</span></Button>}</div>
            <span className="review-upload-hint">上传或直接粘贴 · {images.length}/6 张 · 每张不超过1MB</span><input ref={fileInput} type="file" aria-label="添加评审截图" className="review-file-input" multiple accept="image/png,image/jpeg,image/webp" disabled={loading} onChange={event => { void loadImages([...(event.target.files ?? [])]); }} />
        </div>
        <div className="review-inputs review-inputs-bottom">
            <Form.Select field="author" label="建议人" aria-label="建议人" filter allowCreate placeholder="选择或输入姓名" rules={[{ required: true, message: '请选择或新建建议人' }, { pattern: /\S/, message: '建议人不能为空' }, { max: 50, message: '建议人最多50字' }]} optionList={[...new Set([...authors.names, ...(initialNote?.author ? [initialNote.author] : [])])].map(name => ({ value: name, label: name }))} onChange={value => { if (typeof value === 'string') remember(value); }} onCreate={option => { if (typeof option.value === 'string') { const name = option.value.trim(); remember(name); api.current?.setValue('author', name); } }} />
            <Form.Select field="platform" label="关联端" aria-label="关联端" disabled={Boolean(initialPage)} optionList={[{ value: '', label: '版本整体' }, { value: 'manage', label: '管理端' }, { value: 'mobile', label: '手机端' }]} onChange={value => { setPlatform(value as Platform | ''); api.current?.setValue('pageId', ''); setChangeId(''); }} />
            <Form.Select field="pageId" label="关联页面" aria-label="关联页面" disabled={Boolean(initialPage) || !platform} filter optionList={[{ value: '', label: '版本整体' }, ...pages.filter(page => page.platform === platform).map(page => ({ value: page.id, label: `${page.module} / ${page.title}` }))]} onChange={() => setChangeId('')} />
        </div>
        <div className="review-form-actions">{initialNote && <Button type="danger" theme="borderless" disabled={loading || !canReview(version)} onClick={() => {
            try { deleteReview(version.id, initialNote.id); Toast.success('评审记录已删除'); onDeleted?.(); }
            catch (cause) { setError(cause instanceof Error ? cause.message : '删除失败'); }
        }}>删除评审点</Button>}<Button htmlType="submit" theme="solid" disabled={loading || !canReview(version)}>{initialNote ? '保存修改' : '保存评审备注'}</Button></div>
        {error && <p className="version-errors" role="alert">{error}</p>}
    </Form>;
}
