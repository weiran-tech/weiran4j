import { reviewImages, type ReviewNote } from './reviews';
import { platformLabels, statusLabels, type ProductPage, type Release } from './model';

const escape = (value: string) => value.replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!);
interface ReviewPageGroup { id: string; title: string; path: string; notes: ReviewNote[] }
interface ReviewModuleGroup { name: string; pages: ReviewPageGroup[] }
interface ReviewPlatformGroup { platform: 'manage' | 'mobile' | 'version'; title: string; modules: ReviewModuleGroup[] }

export function groupReviewNotes(pages: ProductPage[], notes: ReviewNote[]): ReviewPlatformGroup[] {
    const groups: ReviewPlatformGroup[] = [];
    for (const note of notes) {
        const page = pages.find(page => page.id === note.pageId && (!note.platform || page.platform === note.platform));
        const platform = note.platform ?? page?.platform ?? 'version';
        let group = groups.find(item => item.platform === platform);
        if (!group) { group = { platform, title: platform === 'version' ? '版本整体 / 未归类' : platformLabels[platform], modules: [] }; groups.push(group); }
        const moduleName = page?.module ?? (note.pageId ? '未归类模块' : '版本整体');
        let module = group.modules.find(item => item.name === moduleName);
        if (!module) { module = { name: moduleName, pages: [] }; group.modules.push(module); }
        let entry = module.pages.find(item => item.id === note.pageId);
        if (!entry) { entry = { id: note.pageId, title: note.pageTitle ?? page?.title ?? (note.pageId || '版本整体'), path: page?.path ?? '', notes: [] }; module.pages.push(entry); }
        entry.notes.push(note);
    }
    const order = { manage: 0, mobile: 1, version: 2 };
    return groups.sort((a, b) => order[a.platform] - order[b.platform]).map(group => ({ ...group, modules: group.modules.sort((a, b) => a.name.localeCompare(b.name, 'zh-CN')).map(module => ({ ...module, pages: module.pages.sort((a, b) => a.id.localeCompare(b.id)) })) }));
}
function renderReviewGroups(groups: ReviewPlatformGroup[]) {
    return groups.map(group => `<section class="review-platform"><h2>${escape(group.title)}</h2>${group.modules.map(module => `<section class="review-module"><h3>${escape(module.name)}</h3>${module.pages.map(page => `<section class="review-page"><h4>${escape(page.title)}</h4><small>${escape(page.id)}${page.path ? ' · ' + escape(page.path) : ''}</small>${page.notes.map(note => `<article><strong>${escape(note.author)}</strong><small> · ${escape(note.date)}${note.updatedAt ? ' · 编辑于 ' + escape(note.updatedAt) : ''}${note.changeId ? ' · ' + escape(note.changeId) : ''}</small><p>${escape(note.text)}</p>${reviewImages(note).filter(image => /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)).map((image, index) => '<img alt="评审附件 ' + (index + 1) + '" src="' + image + '">').join('')}</article>`).join('')}</section>`).join('')}</section>`).join('')}</section>`).join('') || '<p>暂无本机评审记录</p>';
}

export function exportVersion(release: Release, pages: ProductPage[], notes: ReviewNote[], format: 'html' | 'json' = 'html') {
    const groups = groupReviewNotes(pages, notes);
    const content = `<!doctype html><html lang="zh-CN"><meta charset="utf-8"><title>${escape(release.id)} 版本评审</title><style>body{font:15px/1.8 system-ui;max-width:980px;margin:40px auto;padding:0 24px;color:#20242a}h1,h2{color:#0064fa}h3{background:#f0f2f5;padding:8px 12px}h4{font-size:17px;margin-bottom:4px}.review-page{margin:16px 0;padding:0 16px;border-left:2px solid #e4e7ec}article{border-bottom:1px solid #ddd;padding:16px 0}p{white-space:pre-wrap}img{max-width:100%;max-height:600px}small{color:#666}@media print{article{break-inside:avoid}}</style><h1>${escape(release.id)} · ${escape(release.title)}</h1><p>${escape(release.goal)}</p><small>基线 ${escape(release.baseline ?? '无')} · ${escape(release.date)} · ${escape(statusLabels[release.status])} · 本机评审记录，不代表定稿批准</small><h2>评审记录（按端 / 模块 / 页面）</h2>${renderReviewGroups(groups)}</html>`;
    const url = URL.createObjectURL(new Blob([format === 'json' ? JSON.stringify({ release, pages, notes }, null, 2) : content], { type: format === 'json' ? 'application/json' : 'text/html;charset=utf-8' }));
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
