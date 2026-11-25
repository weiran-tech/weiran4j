import { isValidElement, useEffect, type ReactNode } from 'react';
import Markdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { helpArticles, headingId, helpLink, legacyHelpDoc } from '@/prototype/help';
import { helpPath } from '@/prototype/help-menu';
import { currentVersion, sitePath } from '@/prototype/catalog';
import '@/prototype/prototype.css';
import './help.css';

function nodeText(node: ReactNode): string {
    if (typeof node === 'string' || typeof node === 'number' || typeof node === 'bigint') return node.toString();
    if (Array.isArray(node)) return node.map(nodeText).join('');
    if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
    return '';
}
export default function HelpPage() {
    const location = useLocation();
    const params = new URLSearchParams(location.search);
    const legacy = location.pathname.startsWith('/docs');
    const slug = location.pathname.replace(/^\/(?:rp\/)?help\/?/, '');
    const id = legacy ? legacyHelpDoc(location.pathname, location.hash) : slug || params.get('doc') || 'start';
    const articleIndex = helpArticles.findIndex((item) => item.id === id);
    const article = helpArticles[articleIndex];
    useEffect(() => {
        if (!location.hash) return;
        let anchor = location.hash.slice(1); try { anchor = decodeURIComponent(anchor); } catch { return; }
        document.getElementById(anchor)?.scrollIntoView?.();
    }, [id, location.hash]);
    const canonical = (id === 'start' && location.pathname === '/help' && !params.has('doc') ? '/help' : helpPath(id)) + (params.get('embed') === 'page' ? '?embed=page' : '') + location.hash;
    if (location.pathname + location.search + location.hash !== canonical) return <Navigate replace to={canonical} />;
    return <div className="proto-page help-page">
        <header className="proto-heading"><div><div className="proto-eyebrow">使用指南</div><h1>{article?.title || '文章不存在'}</h1><p>从顶部“帮助文档”下拉菜单选择文章。</p></div><div className="proto-actions"><a href="/versions">查看全部版本</a><a href={sitePath('/rp/versions', currentVersion)}>当前版本详情</a></div></header>
        <article className="proto-card help-content" key={id}>{article ? <Markdown remarkPlugins={[remarkGfm]} components={{
            h1: ({ children }) => <h2>{children}</h2>,
            h2: ({ children }) => <h2 id={headingId(nodeText(children))}>{children}</h2>,
            h3: ({ children }) => <h3 id={headingId(nodeText(children))}>{children}</h3>,
            a: ({ href = '', children }) => { const target = helpLink(href); return /^(https?:|mailto:)/.test(target) || target.startsWith('/versions/') ? <a href={target} {...(/^(https?:|mailto:)/.test(target) ? { target: '_blank', rel: 'noreferrer' } : {})}>{children}</a> : <Link to={target}>{children}</Link>; },
        }}>{article.text}</Markdown> : <div role="alert"><p>此文档已移除或不存在，历史内容保留在 Git 和原有快照中。</p><Link to={helpPath('start')}>查看快速开始</Link></div>}</article>
        {article && <nav className="proto-actions" aria-label="相邻指南">{helpArticles[articleIndex - 1] && <Link to={helpPath(helpArticles[articleIndex - 1]!.id)}>上一篇：{helpArticles[articleIndex - 1]!.title}</Link>}{helpArticles[articleIndex + 1] && <Link to={helpPath(helpArticles[articleIndex + 1]!.id)}>下一篇：{helpArticles[articleIndex + 1]!.title}</Link>}</nav>}
    </div>;
}
