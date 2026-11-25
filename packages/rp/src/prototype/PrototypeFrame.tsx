import { embedUrl, PAGE_ONLY_CSS } from '../../prototype/embed.mjs';

export function applyPageEmbed(frame: HTMLIFrameElement) {
    try {
        const doc = frame.contentDocument;
        if (!doc || doc.getElementById('prototype-embed-adapter')) return;
        const style = doc.createElement('style'); style.id = 'prototype-embed-adapter'; style.textContent = PAGE_ONLY_CSS; doc.head.append(style);
    } catch { /* 跨域时交给页面自身的 embed 参数处理 */ }
}

export function PrototypeFrame({ url, title, mode, mobile }: { url: string; title: string; mode: 'page' | 'full'; mobile: boolean }) {
    return <iframe className={`proto-frame${mobile ? ' proto-frame--mobile' : ''}`} title={title} src={embedUrl(url, mode)} onLoad={(event) => {
        // v0.2 等旧快照不认识 embed；只对本站同域 DOM 追加可撤销样式。
        if (mode !== 'page') return;
        applyPageEmbed(event.currentTarget);
    }} />;
}
