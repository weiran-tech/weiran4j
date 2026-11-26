import { Button, Input } from '@douyinfe/semi-ui';
import { useState, type ReactNode } from 'react';
import './versions.css';

/** 阿琅版本详情的概览；业务路由由调用方提供。 */
export function RpVersionOverview({ baseline, date, pages, changes }: { baseline: ReactNode; date: string; pages: number; changes: number }) {
    return <section className="prototype-scope version-summary" aria-label="版本概览"><div><small>固定基线</small>{baseline}</div><div><small>说明日期</small><strong>{date}</strong></div><div><small>本版改动页面</small><strong>{pages} 页</strong></div><div><small>本版变动</small><strong>{changes} 项</strong></div></section>;
}
export interface DirectoryPage {
    id: string; title: string; path: string; module: string;
    changes: { id: string; title: string }[];
    removed?: boolean; href?: string | null; unavailable?: string;
    onDetails?: () => void;
}
/** 页面、链接与改动回调均由项目注册；包内不扫描业务目录。 */
export function RpPageDirectory({ version, pages, full, filters, entries, scopeControls, feedback }: {
    version: string; pages: DirectoryPage[]; full: boolean;
    filters?: ReactNode; entries?: ReactNode; scopeControls?: ReactNode; feedback?: ReactNode;
}) {
    const [keyword, setKeyword] = useState('');
    const [module, setModule] = useState('all');
    const modules = [...new Set(pages.map(page => page.module))];
    const rows = pages.filter(page => (module === 'all' || page.module === module) && `${page.title} ${page.id} ${page.path} ${page.changes.map(change => change.id + ' ' + change.title).join(' ')}`.toLowerCase().includes(keyword.trim().toLowerCase()));
    return <section className="prototype-scope version-directory" aria-label="版本页面目录">
        <div className="proto-heading"><div><h2>{version} · {full ? '完整页面目录' : '本版改动页面'}</h2><p className="proto-muted">{full ? '按模块选择页面，直接体验交互。' : '按页面集中查看本版新增、修改和删除。'}</p></div><div className="version-directory-actions">{filters}{entries}</div></div>
        {feedback}
        <div className="version-toolbar"><Input aria-label="搜索页面" placeholder="搜索页面、编号或改动项" value={keyword} onChange={setKeyword} showClear /><select aria-label="筛选模块" value={module} onChange={event => setModule(event.target.value)}><option value="all">全部模块</option>{modules.map(name => <option key={name}>{name}</option>)}</select>{scopeControls}</div>
        {!rows.length && <div className="version-empty"><h3>没有匹配的页面</h3><p className="proto-muted">请调整端、目录范围或筛选条件。</p></div>}
        {modules.filter(name => rows.some(page => page.module === name)).map(name => <div className="version-module" key={name}><h3>{name}<small>{rows.filter(page => page.module === name).length} 页</small></h3><div className="version-page-grid">{rows.filter(page => page.module === name).map(page => <article className="version-page-row" key={page.id}><div><strong>{page.title}</strong><small>{page.id} · {page.path}</small></div><div className="version-page-footer"><span className="proto-muted">{page.removed ? '本版已删除' : page.changes.length ? `${page.changes.length} 项变动` : '本版未改动 · 沿用基线'}</span><div className="proto-actions">{page.changes.length > 0 && <Button size="small" theme="borderless" aria-label={`查看 ${page.title} 改动说明`} onClick={page.onDetails}>{page.changes.map(change => change.id).join(' / ')} · 改动说明</Button>}{page.href ? <a href={page.href} target="_blank" rel="noreferrer">{page.removed ? '删除前页面' : '打开页面'} →</a> : <span className="proto-muted">{page.unavailable ?? '待登记构建'}</span>}</div></div></article>)}</div></div>)}
    </section>;
}
