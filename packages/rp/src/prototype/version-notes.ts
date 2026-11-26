import { releases } from './catalog';
import type { ReviewContext } from '../../prototype/review.mjs';
import './review-capture.css';
export type NotebookPage = { platform: string; pageId: string; title: string; path: string; introduction?: string; remark?: string };
export type NotebookContext = ReviewContext & { pages?: NotebookPage[]; platformNotes?: Partial<Record<'manage' | 'mobile', { introduction: string; remark: string }>> };
export type VersionNote = { id: string; version: string; platform: string; pageId: string; title: string; page: string; kind: 'introduction' | 'review'; introduction: string; remark: string; image: string; createdAt: string };
const key = (version: string) => `prototype_version_notes_v1_${version}`;
const validImage = (image: string) => !image || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image);
export function readVersionNotes(version: string): VersionNote[] {
    const value: unknown = JSON.parse(localStorage.getItem(key(version)) || '[]');
    if (!Array.isArray(value)) throw new Error('版本备注存储损坏，原数据已保留');
    const valid = (item: unknown): item is VersionNote => {
        if (!item || typeof item !== 'object') return false;
        const note = item as Record<string, unknown>;
        return note.version === version && (note.kind === 'introduction' || note.kind === 'review') && ['id', 'platform', 'pageId', 'title', 'page', 'introduction', 'remark', 'image', 'createdAt'].every((field) => typeof note[field] === 'string') && validImage(note.image as string);
    };
    if (!value.every(valid)) throw new Error('版本备注格式无效，原数据已保留');
    return value;

}
export function saveVersionNote(note: VersionNote) {
    if (releases.find(item => item.id === note.version)?.status !== 'in_progress') throw new Error('已完结或未知版本不可新增和编辑评审');
    if (!note.version || !validImage(note.image)) throw new Error('版本或图片格式无效');
    const notes = readVersionNotes(note.version).filter((old) => old.id !== note.id && !(note.kind === 'introduction' && old.kind === 'introduction' && old.platform === note.platform && old.pageId === note.pageId));
    localStorage.setItem(key(note.version), JSON.stringify([...notes, note]));
    window.dispatchEvent(new Event('weiran-prototype-reviews'));
}
const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
function notebookPages(context: NotebookContext): NotebookPage[] {
    return [{ platform: 'manage', pageId: '__platform__', title: 'PC端整体介绍', path: '', ...context.platformNotes?.manage }, { platform: 'mobile', pageId: '__platform__', title: '手机端整体介绍', path: '', ...context.platformNotes?.mobile }, ...(context.pages || [{ platform: context.platform || 'manage', pageId: context.pageId || context.page || 'version', title: context.pageId || context.page || '版本评审', path: context.page || '' }])];
}
export function versionNoteBundle(context: NotebookContext) {
    const notes = readVersionNotes(context.version);
    const pages = notebookPages(context).map((page) => ({ ...page, ...notes.find((note) => note.kind === 'introduction' && note.platform === page.platform && note.pageId === page.pageId) }));
    return { schemaVersion: 1, version: context.version, baseline: context.baseline, exportedAt: new Date().toISOString(), pages, notes };
}
function download(name: string, value: string, type: string) {
    const url = URL.createObjectURL(new Blob([value], { type }));
    const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportVersionNotes(context: NotebookContext, format: 'json' | 'html') {
    const bundle = versionNoteBundle(context);
    if (format === 'json') { download(`${context.version}-介绍与评审.json`, JSON.stringify(bundle, null, 2), 'application/json'); return; }
    const section = (title: string, introduction: string, remark: string, image = '') => `<article><h2>${escape(title)}</h2><p>${escape(introduction)}</p><p>${escape(remark)}</p>${image ? `<img alt="评审图片" src="${image}">` : ''}</article>`;
    const pages = bundle.pages.map((page) => section(`${page.platform === 'mobile' ? '手机端' : 'PC端'} · ${page.title}`, page.introduction || '', 'remark' in page ? String(page.remark) : '', 'image' in page ? String(page.image) : '')).join('');
    const notes = bundle.notes.filter((note) => note.kind === 'review').map((note) => section(`${note.platform === 'mobile' ? '手机端' : 'PC端'} · ${note.title} · ${note.kind === 'review' ? '评审' : '端介绍'} · ${note.createdAt}`, note.introduction, note.remark, note.image)).join('');
    download(`${context.version}-介绍与评审.html`, `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><title>${escape(context.version)} 介绍与评审</title><style>body{font:16px/1.7 system-ui;max-width:1000px;margin:32px auto;padding:16px}article{border-bottom:1px solid #ddd;break-inside:avoid;padding:16px 0}p{white-space:pre-wrap;overflow-wrap:anywhere}img{max-width:100%}</style><h1>${escape(context.version)} 介绍与评审</h1><p>基线：${escape(context.baseline || '无')} · 本浏览器记录，未自动提交评审。</p>${pages}${notes}</html>`, 'text/html');
}
let opened = false;
export function openVersionNotebook(context: NotebookContext) {
    if (opened) return;
    if (!context.version) throw new Error('必须先选择工作版本');
    opened = true;
    const writable = releases.find(item => item.id === context.version)?.status === 'in_progress';
    const opener = document.activeElement;
    const make = <K extends keyof HTMLElementTagNameMap>(tag: K, text = '') => { const node = document.createElement(tag); node.textContent = text; return node; };
    const dialog = make('dialog'); dialog.className = 'review-capture'; dialog.setAttribute('aria-label', '版本介绍与评审备注'); dialog.setAttribute('data-html2canvas-ignore', 'true');
    const header = make('header'); header.append(make('h2', `${context.version} · 介绍与评审备注`)); const close = make('button', '关闭'); header.append(close);
    const hint = make('p', 'Ctrl / ⌘ + Shift + E 呼出。记录仅保存在此浏览器，按版本批量导出；图片可选择或粘贴。导出的 HTML 包含图片，可打印为 PDF。');
    const status = make('p'); status.setAttribute('role', 'status');
    const kind = make('select'); kind.setAttribute('aria-label', '记录类型'); for (const [value, text] of [['review', '评审备注'], ['introduction', '页面 / 端介绍与备注']] as const) { const option = make('option', text); option.value = value; kind.append(option); }
    const pages = notebookPages(context);
    const page = make('select'); page.setAttribute('aria-label', '备注页面'); pages.forEach((entry, index) => { const option = make('option', `${entry.platform === 'mobile' ? '手机端' : 'PC端'} · ${entry.title}`); option.value = String(index); page.append(option); });
    page.value = String(Math.max(0, pages.findIndex((entry) => entry.pageId === context.pageId && entry.platform === context.platform)));
    const introduction = make('textarea'); introduction.rows = 3; introduction.placeholder = '页面或适用端介绍'; introduction.setAttribute('aria-label', '介绍');
    const remark = make('textarea'); remark.rows = 4; remark.placeholder = '备注、评审问题、预期结果'; remark.setAttribute('aria-label', '评审备注');
    const file = make('input'); file.type = 'file'; file.accept = 'image/png,image/jpeg,image/webp'; file.setAttribute('aria-label', '评审图片');
    const preview = make('img'); preview.alt = '待保存的评审图片'; preview.style.maxWidth = '100%'; preview.hidden = true; let image = ''; let imageSequence = 0; let dirty = false; let editingId = '';
    const imageClear = make('button', '移除待保存图片'); imageClear.onclick = () => { imageSequence++; readingImage = false; image = ''; preview.hidden = true; file.value = ''; dirty = true; };
    const guard = () => !dirty || window.confirm('备注尚未保存，是否放弃修改？');
    function fill() {
        imageSequence++; readingImage = false;
        try { const selected = pages[Number(page.value)]!; const saved = kind.value === 'introduction' ? readVersionNotes(context.version).find((note) => note.kind === 'introduction' && note.platform === selected.platform && note.pageId === selected.pageId) : undefined; editingId = saved?.id || ''; introduction.value = saved?.introduction || (kind.value === 'introduction' ? selected.introduction || '' : ''); remark.value = saved?.remark || (kind.value === 'introduction' ? selected.remark || '' : ''); image = saved?.image || ''; preview.hidden = !image; preview.src = image; file.value = ''; dirty = false; } catch (error) { status.textContent = String(error); }
    }
    let previousPage = page.value; let previousKind = kind.value;
    page.onchange = () => { if (!guard()) { page.value = previousPage; return; } previousPage = page.value; fill(); };
    kind.onchange = () => { if (!guard()) { kind.value = previousKind; return; } previousKind = kind.value; fill(); };
    introduction.oninput = remark.oninput = () => { dirty = true; };
    let readingImage = false;
    async function loadImage(value: File) {
        if (!['image/png', 'image/jpeg', 'image/webp'].includes(value.type) || value.size > 2 * 1024 * 1024) { status.textContent = '请选择不超过 2 MB 的 PNG、JPEG 或 WebP 图片'; return; }
        readingImage = true; const sequence = ++imageSequence;
        try { const data = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => typeof reader.result === 'string' ? resolve(reader.result) : reject(new Error('图片读取失败')); reader.onerror = reject; reader.readAsDataURL(value); }); if (!dialog.isConnected || sequence !== imageSequence) return; if (!validImage(data)) throw new Error('图片格式无效'); image = data; preview.src = data; preview.hidden = false; dirty = true; status.textContent = '图片已载入，保存后才会保留'; } catch { status.textContent = '图片读取失败'; } finally { if (sequence === imageSequence) readingImage = false; }
    }
    file.onchange = () => { if (file.files?.[0]) void loadImage(file.files[0]); };
    dialog.addEventListener('paste', (event) => { const value = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith('image/')); if (value) { event.preventDefault(); void loadImage(value); } });
    const save = make('button', '保存本机备注'); save.onclick = () => {
        if (readingImage) { status.textContent = '请等待图片读取完成'; return; }
        if (!introduction.value.trim() && !remark.value.trim() && !image) { status.textContent = '请填写介绍、备注或添加图片'; return; }
        try { const selected = pages[Number(page.value)]!; saveVersionNote({ id: editingId || crypto.randomUUID(), version: context.version, platform: selected.platform, pageId: selected.pageId, title: selected.title, page: selected.path, kind: kind.value as VersionNote['kind'], introduction: introduction.value, remark: remark.value, image, createdAt: new Date().toISOString() }); dirty = false; if (kind.value === 'review') { introduction.value = ''; remark.value = ''; image = ''; preview.hidden = true; editingId = ''; } renderHistory(); status.textContent = '已保存到本浏览器，仅保存在本浏览器'; } catch (error) { status.textContent = `保存失败，内容仍在窗口中：${String(error)}`; }
    };
    save.disabled = !writable; imageClear.disabled = !writable;
    for (const control of [kind, page, introduction, remark, file]) control.disabled = !writable;
    if (!writable) hint.textContent = '本版本已完结，已有本机备注只读，可查看和导出。';
    const actions = make('div'); actions.className = 'review-capture-actions'; actions.append(save, imageClear);
    for (const [format, text] of [['html', '按版本导出 HTML（图片 / 可打印 PDF）'], ['json', '按版本导出 JSON']] as const) { const button = make('button', text); button.onclick = () => { try { if (dirty) { status.textContent = '请先保存当前备注再导出'; return; } exportVersionNotes(context, format); status.textContent = '已导出当前版本的双端介绍和本机评审记录'; } catch (error) { status.textContent = String(error); } }; actions.append(button); }
    const history = make('div'); history.setAttribute('aria-label', '本版本已保存备注');
    function renderHistory() { history.replaceChildren(make('h3', '本版本已保存备注')); try { for (const note of readVersionNotes(context.version)) { const row = make('article'); row.append(make('strong', `${note.platform === 'mobile' ? '手机端' : 'PC端'} · ${note.title} · ${note.kind === 'review' ? '评审' : '介绍'}`), make('p', note.introduction), make('p', note.remark)); if (note.image) { const img = make('img'); img.src = note.image; img.alt = '已保存评审图片'; img.style.maxWidth = '100%'; row.append(img); } const remove = make('button', '删除此备注'); remove.onclick = () => { if (!window.confirm('删除此版本的这条本机备注？')) return; try { localStorage.setItem(key(context.version), JSON.stringify(readVersionNotes(context.version).filter((item) => item.id !== note.id))); renderHistory(); } catch (error) { status.textContent = String(error); } }; if (writable) row.append(remove); history.append(row); } } catch (error) { status.textContent = String(error); } }
    const cleanup = () => { dialog.remove(); opened = false; if (opener instanceof HTMLElement) opener.focus(); };
    close.onclick = () => { if (guard()) cleanup(); }; dialog.addEventListener('cancel', (event) => { event.preventDefault(); if (guard()) cleanup(); });
    dialog.append(header, hint, kind, page, introduction, remark, file, preview, actions, status, history); document.body.append(dialog); fill(); renderHistory(); dialog.showModal(); remark.focus();
}
export function installVersionNotesShortcut(context: () => NotebookContext | null) {
    const handler = (event: KeyboardEvent) => { if (event.isComposing || event.repeat || !(event.ctrlKey || event.metaKey) || !event.shiftKey || event.key.toLowerCase() !== 'e' || document.querySelector('dialog[open]')) return; const current = context(); if (!current) return; event.preventDefault(); openVersionNotebook(current); };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
}
