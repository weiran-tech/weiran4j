import { Button, Modal } from '@douyinfe/semi-ui';
import { Search, Monitor, Smartphone, ArrowUpRight } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import './quick-search.css';
export type SearchPage = { id: string; title: string; path: string; platform: string; keywords: string };
export function searchPrototypePages(keyword: string, searchPages: readonly SearchPage[]) {
    const tokens = keyword.trim().toLowerCase().split(/\s+/).filter(Boolean);
    return searchPages.filter(page => !page.path.includes(':') && tokens.every(token => `${page.title} ${page.id} ${page.path} ${page.keywords}`.toLowerCase().includes(token)))
        .sort((a, b) => Number(b.title === keyword || b.path === keyword) - Number(a.title === keyword || a.path === keyword));
}
export function RpQuickSearch({ pages, locked = false, onNavigate }: { pages: readonly SearchPage[]; locked?: boolean; onNavigate: (path: string) => void }) {
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [active, setActive] = useState(0);
    const input = useRef<HTMLInputElement>(null);
    const options = useRef<HTMLDivElement>(null);
    const results = searchPrototypePages(keyword, pages);
    const selected = Math.min(active, Math.max(0, results.length - 1));
    const show = () => { setKeyword(''); setActive(0); setOpen(true); };
    useEffect(() => {
        if (locked) return;
        const handler = (event: KeyboardEvent) => {
            if (event.metaKey && !event.ctrlKey && !event.altKey && !event.shiftKey && event.key.toLowerCase() === 'p' && !event.isComposing) {
                event.preventDefault(); setKeyword(''); setActive(0); setOpen(true);
            }
        };
        const trigger = () => { setKeyword(''); setActive(0); setOpen(true); };
        window.addEventListener('keydown', handler);
        window.addEventListener('prototype:quick-search', trigger);
        return () => { window.removeEventListener('keydown', handler); window.removeEventListener('prototype:quick-search', trigger); };
    }, [locked]);
    useEffect(() => { options.current?.querySelector('[aria-selected="true"]')?.scrollIntoView?.({ block: 'nearest' }); }, [selected, keyword]);
    const jump = (page: SearchPage) => { setOpen(false); onNavigate(page.path); };
    return <><Button className="prototype-scope prototype-search-launcher" aria-label="搜索原型页面" title="搜索原型 / 页面 / 菜单（⌘ P）" aria-keyshortcuts="Meta+P" icon={<Search size={19} />} onClick={show} style={locked ? { display: 'none' } : undefined} />
        <Modal className="prototype-scope" title="快速跳转" visible={open && !locked} footer={null} width="min(640px, calc(100vw - 32px))" onCancel={() => setOpen(false)} afterVisibleChange={(visible: boolean) => { if (visible) input.current?.focus(); }} destroyOnClose>
            <div className="prototype-search-input"><Search size={18} /><input ref={input} autoFocus role="combobox" aria-label="搜索原型、页面或菜单" aria-expanded="true" aria-controls="prototype-search-results" aria-activedescendant={results.length ? `prototype-result-${selected}` : undefined} value={keyword} placeholder="输入名称、路由或关键词…" onChange={event => { setKeyword(event.target.value); setActive(0); }} onKeyDown={event => {
                if (event.nativeEvent.isComposing) return;
                if (event.key === 'ArrowDown' || event.key === 'ArrowUp') { event.preventDefault(); setActive((selected + (event.key === 'ArrowDown' ? 1 : -1) + results.length) % (results.length || 1)); }
                if (event.key === 'Enter' && results[selected]) { event.preventDefault(); jump(results[selected]); }
            }} /></div>
            <div ref={options} id="prototype-search-results" role="listbox" aria-label="页面搜索结果" className="prototype-search-results">{results.map((page, index) => <div id={`prototype-result-${index}`} key={page.id} role="option" aria-selected={selected === index} className="prototype-search-result" onMouseEnter={() => setActive(index)} onClick={() => jump(page)}>{page.platform === 'mobile' ? <Smartphone size={18} /> : <Monitor size={18} />}<div><strong>{page.title}<small>{page.platform === 'mobile' ? '手机端' : '管理端'}</small></strong><code>{page.path}</code></div><ArrowUpRight size={16} /></div>)}{!results.length && <p className="prototype-search-empty">没有匹配页面，试试页面名称或路由</p>}</div>
            <div className="prototype-search-footer"><span>{results.length} 个页面 · 当前完整产品</span><span>↑↓ 选择 · Enter 跳转 · Esc 关闭</span></div>
        </Modal></>;
}
