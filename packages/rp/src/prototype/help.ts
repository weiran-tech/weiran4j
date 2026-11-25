import { helpEntries, helpPath } from './help-menu';
import start from '@/pages/help/content/start.md?raw';
import onboarding from '@/pages/help/content/onboarding.md?raw';
import workflow from '@/pages/help/content/workflow.md?raw';
import product from '@/pages/help/content/product.md?raw';
import review from '@/pages/help/content/review.md?raw';
import delivery from '@/pages/help/content/delivery.md?raw';
import versions from '@/pages/help/content/versions.md?raw';
import sharing from '@/pages/help/content/sharing.md?raw';
import development from '@/pages/help/content/development.md?raw';
import deployment from '@/pages/help/content/deployment.md?raw';

const texts = { start, onboarding, workflow, product, review, delivery, versions, sharing, development, deployment };
export const helpArticles = helpEntries.map((entry) => ({ ...entry, text: texts[entry.id] }));
export function headingId(title: string) { return title.toLowerCase().replace(/[^\p{L}\p{N}\s-]/gu, '').trim().replace(/\s+/g, '-'); }
export function legacyHelpDoc(path: string, hash = ''): string {
    const slug = path.replace(/^\/docs\/?/, '').replace(/\.(md|html)$/, '').replace(/\/$/, '');
    if (helpEntries.some((entry) => entry.id === slug)) return slug;
    if (slug === 'prototype') {
        let anchor = hash; try { anchor = decodeURIComponent(hash); } catch { /* 无效编码保留原值 */ }
        if (/评审|问题|定稿/.test(anchor)) return 'review';
        if (/研发接单|产品验收|业务发布/.test(anchor)) return 'delivery';
        if (/共享|维护/.test(anchor)) return 'sharing';
        if (/对比|嵌入|历史/.test(anchor)) return 'versions';
        return 'product';
    }
    return ({ '': 'start', index: 'start', usage: 'start', onboarding: 'onboarding', workflow: 'workflow', 'workflow-audit-v05': 'workflow', architecture: 'development', configuration: 'development', mock: 'development', deployment: 'deployment' } as Record<string, string>)[slug] || 'removed';
}
/** 旧文档和文章参数迁移到独立指南路径；全局指南不携带版本上下文。 */
export function helpLink(href: string): string {
    if (!href || href.startsWith('#') || /^(https?:|mailto:)/.test(href)) return href;
    const link = new URL(href, 'https://prototype.local/docs/');
    if (link.pathname.startsWith('/docs')) return helpPath(legacyHelpDoc(link.pathname, link.hash)) + link.hash;
    if (link.pathname === '/rp/help' || link.pathname === '/help') return helpPath(link.searchParams.get('doc') || 'start') + link.hash;
    if (link.pathname.startsWith('/rp/help/')) return link.pathname.replace('/rp/help/', '/help/') + link.hash;
    return link.pathname + link.search + link.hash;
}
