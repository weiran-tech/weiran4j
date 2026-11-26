import { reviewImages, type ReviewNote } from '@/mocks/prototype';
import { platformLabels, statusLabels, type ProductPage, type Release } from './version-model';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
export function exportVersion(release: Release, pages: ProductPage[], notes: ReviewNote[], format: 'json' | 'html') {
    const payload = { release, pages, reviews: notes.map(note => ({ ...note, versionId: release.id, pageTitle: pages.find(page => page.id === note.pageId)?.title ?? '版本整体', changeTitle: release.changes.find(change => change.id === note.changeId)?.title ?? null })), exportedAt: new Date().toISOString(), source: '当前浏览器记录；不代表共享评审结论' };
    const content = format === 'json' ? JSON.stringify(payload, null, 2) : `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escape(release.id)} 版本评审</title><style>body{font:15px/1.8 system-ui;max-width:980px;margin:40px auto;padding:0 24px;color:#20242a}h1,h2{color:#0064fa}article{border-bottom:1px solid #ddd;padding:16px 0}p{white-space:pre-wrap}img{max-width:100%;max-height:600px}small{color:#666}@media print{article{break-inside:avoid}}</style><h1>${escape(release.id)} · ${escape(release.title)}</h1><p>${escape(release.goal)}</p><small>基线 ${escape(release.baseline ?? '无')} · ${escape(release.date)} · ${escape(statusLabels[release.status])} · 本机评审记录，不代表定稿批准</small><h2>完整页面目录</h2>${pages.map((page) => `<article>${escape(platformLabels[page.platform])} / ${escape(page.module)} / ${escape(page.title)}<small> · ${escape(page.id)}</small></article>`).join('')}<h2>本版改动</h2>${release.changes.map((change) => `<article><h3>${escape(change.id)} · ${escape(change.title)}</h3><p>${escape(platformLabels[change.platform ?? 'manage'])} / ${escape(change.pageId)} / ${escape(change.pageTitle)}</p><p>调整前：${escape(change.before)}</p><p>调整后：${escape(change.after)}</p><p>规则：${escape(change.rules.join('\n'))}</p><p>验收：${escape(change.acceptance.join('\n'))}</p></article>`).join('') || '<p>本版无页面改动</p>'}<h2>评审备注</h2>${notes.map((note) => `<article><h3>${escape(note.author)} · ${escape(pages.find((page) => page.id === note.pageId)?.title ?? '版本整体')}</h3><small>${escape(release.id)} · ${escape(note.date)} · ${escape(note.changeId ?? '未关联变动项')}</small><p>${escape(note.text)}</p>${reviewImages(note).filter(image => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)).map((image, index) => '<img alt="评审附件 ' + (index + 1) + '" src="' + image + '">').join('')}</article>`).join('') || '<p>暂无本机评审记录</p>'}</html>`;
    const url = URL.createObjectURL(new Blob([content], { type: format === 'json' ? 'application/json' : 'text/html;charset=utf-8' }));
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = `${release.id}-review.${format}`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function exportReviewArchive(notes: Record<string, ReviewNote[]>) {
    const content = JSON.stringify({ reviews: notes, exportedAt: new Date().toISOString(), source: '本机评审存档；旧本机版本不作为项目版本' }, null, 2);
    const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
    const link = document.createElement('a'); link.href = url; link.download = 'local-review-archive.json'; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}
