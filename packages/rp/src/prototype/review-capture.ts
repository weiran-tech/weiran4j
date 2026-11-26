import { releases } from './catalog';
import type { ReviewContext } from '../../prototype/review.mjs';
import { runtimeStorageId } from './runtime';
import './review-capture.css';

type Mark = { x: number; y: number; width: number; height: number; text: string };
type RecordItem = { id: string; context: ReviewContext; createdAt: string; image: string; marks: Mark[]; note: string; source?: 'page' | 'upload' };
const storageKey = `prototype_review_captures_${runtimeStorageId}`;
let active = false;

function element<K extends keyof HTMLElementTagNameMap>(tag: K, text = '', className = '') {
    const node = document.createElement(tag);
    node.textContent = text;
    node.className = className;
    return node;
}

/** 中文与长 URL 按字宽换行；返回每行文字，供多页 PDF 绘制。 */
export function wrapReviewText(context: CanvasRenderingContext2D, value: string, width: number) {
    return value.split('\n').flatMap((paragraph) => {
        const lines: string[] = [];
        let line = '';
        for (const char of paragraph) {
            if (line && context.measureText(line + char).width > width) { lines.push(line); line = ''; }
            line += char;
        }
        return [...lines, line];
    });
}

function readRecords(): RecordItem[] {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) throw new Error('本机记录格式无效，请先导出当前记录');
    return parsed.filter((entry: unknown): entry is RecordItem => {
        if (!entry || typeof entry !== 'object') return false;
        const item = entry as Partial<RecordItem>;
        return typeof item.id === 'string' && typeof item.createdAt === 'string' && typeof item.image === 'string'
            && typeof item.context?.version === 'string' && typeof item.note === 'string' && Array.isArray(item.marks)
            && item.marks.every((mark) => ['x', 'y', 'width', 'height'].every((key) => typeof mark[key as keyof Mark] === 'number') && typeof mark.text === 'string');
    });
}

/** 原生 dialog 在 React 管理端及 Vue 手机端共用；图片和意见只保存到本浏览器。 */
export function openReviewCapture(context: ReviewContext, getTarget: () => HTMLElement | null = () => document.body) {
    const writable = releases.find(item => item.id === context.version)?.status === 'in_progress';
    if (active) return;
    active = true;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = element('dialog', '', 'review-capture');
    dialog.setAttribute('aria-label', '截图标注与评审记录');
    dialog.setAttribute('data-html2canvas-ignore', 'true');
    const header = element('header');
    header.append(element('h2', '截图标注与评审记录'));
    const close = element('button', '关闭'); close.type = 'button';
    header.append(close);
    const info = element('p', `${context.version} · ${context.platform === 'mobile' ? '手机端' : '管理端'} · ${context.pageId || context.page || '当前页'}`);
    const hint = element('p', '选择手动截取的图片，或点击截取当前网页；在图片上拖动框选后填写意见。不调用系统截屏，本机记录需手动上传到版本 Discussion。');
    const controls = element('div', '', 'review-capture-actions');
    const upload = element('button', '选择已有截图');
    const fileInput = element('input'); fileInput.type = 'file'; fileInput.accept = 'image/png,image/jpeg,image/webp'; fileInput.hidden = true; fileInput.setAttribute('aria-label', '上传截图');
    const capture = element('button', '截取当前页面');
    const undo = element('button', '撤销最后标注');
    const save = element('button', '保存本机记录');
    const pdf = element('button', '导出标注 PDF');
    for (const button of [upload, capture, undo, save, pdf]) { button.type = 'button'; controls.append(button); }
    controls.append(fileInput);
    const status = element('p', '', 'review-capture-status'); status.setAttribute('role', 'status');
    const stage = element('div', '', 'review-capture-stage');
    const canvas = element('canvas'); canvas.setAttribute('aria-label', '评审截图，拖动框选标注区域');
    stage.append(canvas); stage.hidden = true;
    const accessible = element('button', '标注整张截图'); accessible.type = 'button';
    const marks = element('div', '', 'review-capture-marks');
    const noteLabel = element('label', '整体评审意见');
    const note = element('textarea'); note.rows = 3; note.maxLength = 5000; note.setAttribute('aria-label', '整体评审意见'); noteLabel.append(note);
    const history = element('details'); history.append(element('summary', '本版本的本机截图记录'));
    const historyList = element('div', '', 'review-capture-history'); history.append(historyList);
    dialog.append(header, info, hint, controls, status, stage, accessible, marks, noteLabel, history);
    document.body.append(dialog);
    dialog.showModal();
    let item: RecordItem | null = null;
    let base: HTMLImageElement | null = null;
    let busy = false;
    let dirty = false;
    let start: { x: number; y: number } | null = null;
    let preview: Mark | null = null;
    const describeError = (error: unknown) => { status.textContent = error instanceof Error ? error.message : '操作失败，请重试'; };
    const guard = () => !dirty || window.confirm('当前标注尚未保存，是否放弃这些修改？');
    const updateButtons = () => { for (const button of [upload, capture, undo, save, pdf, accessible]) button.disabled = busy || (button !== capture && button !== upload && !item); for (const button of [upload, capture, undo, save, accessible]) button.disabled ||= !writable; undo.disabled ||= !item?.marks.length; note.disabled = busy || !item || !writable; close.disabled = busy; for (const input of marks.querySelectorAll('textarea')) input.disabled = busy || !writable; };
    function draw() {
        const ctx = canvas.getContext('2d');
        if (!ctx || !base || !item) return;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(base, 0, 0);
        [...item.marks, ...(preview ? [preview] : [])].forEach((mark, index) => {
            const x = mark.x * canvas.width; const y = mark.y * canvas.height;
            ctx.strokeStyle = '#dc2626'; ctx.lineWidth = Math.max(2, canvas.width / 500);
            ctx.strokeRect(x, y, mark.width * canvas.width, mark.height * canvas.height);
            const radius = Math.max(12, canvas.width / 65);
            const cx = Math.min(canvas.width - radius, Math.max(radius, x));
            const cy = Math.min(canvas.height - radius, Math.max(radius, y));
            ctx.fillStyle = '#dc2626'; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#fff'; ctx.font = `bold ${radius * 1.2}px sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(String(index + 1), cx, cy);
        });
    }
    function renderMarks() {
        marks.replaceChildren();
        item?.marks.forEach((mark, index) => {
            const label = element('label', `标注 ${index + 1}`);
            const input = element('textarea'); input.rows = 2; input.maxLength = 2000; input.value = mark.text; input.setAttribute('aria-label', `标注 ${index + 1} 的意见`);
            input.oninput = () => { mark.text = input.value; dirty = true; };
            label.append(input); marks.append(label);
        });
        updateButtons();
    }
    async function load(record: RecordItem) {
        const image = new Image();
        image.src = record.image;
        await image.decode();
        base = image; item = structuredClone(record);
        canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
        stage.hidden = false; note.value = item.note;
        info.textContent = `${item.context.version} · ${item.context.platform === 'mobile' ? '手机端' : '管理端'} · ${item.context.pageId || item.context.page || '当前页'} · ${new Date(item.createdAt).toLocaleString()}`;
        preview = null; start = null; draw(); renderMarks();
    }
    function renderHistory() {
        historyList.replaceChildren();
        try {
            const records = readRecords().filter((record) => record.context.version === context.version);
            if (!records.length) historyList.append(element('p', '本浏览器尚无此版本的截图记录。'));
            for (const record of records) {
                const row = element('div');
                const open = element('button', `${new Date(record.createdAt).toLocaleString()} · ${record.context.pageId || record.context.page || '当前页'}`);
                open.type = 'button'; open.onclick = async () => { if (busy || !guard()) return; try { await load(record); dirty = false; status.textContent = '已打开本机记录'; } catch (error) { describeError(error); } };
                const remove = element('button', '删除'); remove.type = 'button';
                remove.onclick = () => { if (!writable || busy || !window.confirm('删除这条本机截图记录？')) return; try { localStorage.setItem(storageKey, JSON.stringify(readRecords().filter((entry) => entry.id !== record.id))); renderHistory(); status.textContent = '已删除本机记录'; } catch (error) { describeError(error); } };
                row.append(open, remove); historyList.append(row);
            }
        } catch (error) { describeError(error); }
    }
    const point = (event: PointerEvent) => { const rect = canvas.getBoundingClientRect(); return { x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)), y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)) }; };
    canvas.onpointerdown = (event) => { if (!item || busy) return; start = point(event); canvas.setPointerCapture(event.pointerId); };
    canvas.onpointermove = (event) => {
        if (!start) return;
        const end = point(event);
        preview = { x: Math.min(start.x, end.x), y: Math.min(start.y, end.y), width: Math.abs(end.x - start.x), height: Math.abs(end.y - start.y), text: '' }; draw();
    };
    canvas.onpointerup = () => {
        if (item && preview && preview.width * canvas.width >= 6 && preview.height * canvas.height >= 6) { item.marks.push(preview); dirty = true; }
        start = null; preview = null; draw(); renderMarks();
    };
    canvas.onpointercancel = () => { start = null; preview = null; draw(); };
    accessible.onclick = () => { if (!item) return; item.marks.push({ x: 0.02, y: 0.02, width: 0.96, height: 0.96, text: '' }); dirty = true; draw(); renderMarks(); marks.querySelector<HTMLTextAreaElement>('label:last-child textarea')?.focus(); };
    undo.onclick = () => { item?.marks.pop(); dirty = true; draw(); renderMarks(); };
    note.oninput = () => { if (item) { item.note = note.value; dirty = true; } };
    upload.onclick = () => { if (!busy && guard()) fileInput.click(); };
    fileInput.onchange = async () => {
        const file = fileInput.files?.[0]; fileInput.value = '';
        if (!file || busy) return;
        busy = true; updateButtons(); status.textContent = '正在读取截图…';
        const url = URL.createObjectURL(file);
        try {
            if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('请选择不超过 10 MB 的 PNG、JPEG 或 WebP 截图。');
            const image = new Image(); image.src = url; await image.decode();
            if (!image.naturalWidth || !image.naturalHeight || image.naturalWidth * image.naturalHeight > 24_000_000) throw new Error('截图尺寸无效或超过 2400 万像素，请缩小后再选择。');
            const normalized = document.createElement('canvas');
            const scale = Math.min(1, 2000 / image.naturalWidth, 6000 / image.naturalHeight);
            normalized.width = Math.round(image.naturalWidth * scale); normalized.height = Math.round(image.naturalHeight * scale);
            const ctx = normalized.getContext('2d'); if (!ctx) throw new Error('无法读取截图');
            ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, normalized.width, normalized.height); ctx.drawImage(image, 0, 0, normalized.width, normalized.height);
            await load({ id: crypto.randomUUID(), context: { ...context, pageUrl: context.pageUrl || window.location.href }, createdAt: new Date().toISOString(), image: normalized.toDataURL('image/jpeg', 0.85), marks: [], note: '', source: 'upload' });
            dirty = true; status.textContent = '已载入手动截图，请核对图片与关联页面后标注。';
        } catch (error) { describeError(error); }
        finally { URL.revokeObjectURL(url); busy = false; updateButtons(); }
    };
    capture.onclick = async () => {
        if (busy || !guard()) return;
        busy = true; updateButtons(); status.textContent = '正在截图…';
        try {
            const target = getTarget();
            const view = target?.ownerDocument.defaultView;
            if (!target || !view || !target.isConnected) throw new Error('页面尚未加载或无法访问，请在同域页面加载完成后重试。');
            const { default: html2canvas } = await import('html2canvas-pro');
            const shot = await html2canvas(target, { useCORS: true, backgroundColor: '#ffffff', scale: Math.min(2, view.devicePixelRatio || 1), x: view.scrollX, y: view.scrollY, width: view.innerWidth, height: view.innerHeight, windowWidth: view.innerWidth, windowHeight: view.innerHeight, logging: false });
            if (!shot.width || !shot.height) throw new Error('没有捕获到画面，请重试。');
            await load({ id: crypto.randomUUID(), context: { ...context, pageUrl: view.location.href }, createdAt: new Date().toISOString(), image: shot.toDataURL('image/jpeg', 0.85), marks: [], note: '', source: 'page' });
            dirty = true;
            status.textContent = '截图完成。拖动框选或使用“标注整张截图”，填写意见后保存或导出。';
        } catch (error) { describeError(error); }
        finally { busy = false; updateButtons(); }
    };
    save.onclick = () => {
        if (!writable) return;
        if (!item) return;
        try {
            const records = readRecords().filter((entry) => entry.id !== item!.id);
            if (records.length >= 12) throw new Error('本机构建最多保存 12 条截图，请导出并删除旧记录后再保存。');
            localStorage.setItem(storageKey, JSON.stringify([item, ...records]));
            dirty = false; renderHistory(); status.textContent = '已保存到本浏览器，不会自动提交。';
        } catch { status.textContent = '保存失败：本机存储不可用、已满或超过 12 条。可先导出 PDF，再清理旧记录。'; }
    };
    pdf.onclick = async () => {
        if (!item || busy) return;
        busy = true; updateButtons(); status.textContent = '正在生成 PDF…';
        try { preview = null; draw(); await exportReviewPdf(item, canvas); status.textContent = 'PDF 已导出，包含截图、标注与意见。请手动上传至版本 Discussion。'; }
        catch (error) { describeError(error); }
        finally { busy = false; updateButtons(); }
    };
    close.onclick = () => { if (!busy && guard()) dialog.close(); };
    dialog.oncancel = (event) => { if (busy || !guard()) event.preventDefault(); };
    dialog.onclose = () => { dialog.remove(); active = false; opener?.focus(); };
    renderHistory(); updateButtons();
}

async function exportReviewPdf(item: RecordItem, screenshot: HTMLCanvasElement) {
    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    pdf.setProperties({ title: `${item.context.version} review`, subject: item.context.pageUrl || '' });
    // 将中文正文绘制为图片，避免依赖外部中文字体；A4 2 倍分辨率逐页排版。
    const sheet = document.createElement('canvas'); sheet.width = 1240; sheet.height = 1754;
    const ctx = sheet.getContext('2d'); if (!ctx) throw new Error('浏览器不支持 PDF 画布');
    let first = true; let y = 70;
    const reset = () => { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, sheet.width, sheet.height); ctx.fillStyle = '#17233d'; ctx.font = '26px sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top'; y = 70; };
    const flush = () => { if (!first) pdf.addPage(); pdf.addImage(sheet, 'JPEG', 0, 0, 210, 297); first = false; reset(); };
    reset();
    const lines = [
        '原型页面评审记录', `版本：${item.context.version} · 基线：${item.context.baseline || '无'}`,
        `端：${item.context.platform === 'mobile' ? '手机端' : '管理端'} · 页面：${item.context.pageId || item.context.page || '当前页'}`,
        `改动：${item.context.change?.id || '未指定'} · 场景：${item.context.scenario || 'normal'}`,
        `记录时间：${new Date(item.createdAt).toLocaleString()}`, `截图来源：${item.source === 'upload' ? '手动上传（请核对图片与关联页面）' : '当前网页'}`, `关联页面：${item.context.pageUrl || ''}`,
        `整体意见：${item.note || '未填写'}`, ...item.marks.map((mark, index) => `标注 ${index + 1}：${mark.text || '未填写意见'}`),
        '此文件为本机评审记录；本人确认与阻塞复核以版本 Discussion 为准。',
    ];
    for (const paragraph of lines) {
        for (const line of wrapReviewText(ctx, paragraph, 1100)) {
            if (y > 1650) flush(); ctx.fillText(line, 70, y); y += 38;
        }
        y += 20;
    }
    flush();
    const slice = document.createElement('canvas'); slice.width = screenshot.width;
    const sliceHeight = Math.floor(screenshot.width * 277 / 190);
    for (let offset = 0; offset < screenshot.height; offset += sliceHeight) {
        slice.height = Math.min(sliceHeight, screenshot.height - offset);
        const piece = slice.getContext('2d'); if (!piece) throw new Error('截图分页失败');
        piece.drawImage(screenshot, 0, offset, screenshot.width, slice.height, 0, 0, screenshot.width, slice.height);
        pdf.addPage(); pdf.addImage(slice, 'JPEG', 10, 10, 190, slice.height / screenshot.width * 190);
    }
    pdf.save(`${item.context.version}-${item.context.pageId || item.context.platform || 'page'}-${item.id.slice(0, 8)}-review.pdf`);
}
