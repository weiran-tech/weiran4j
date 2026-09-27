import { Input } from '@douyinfe/semi-ui';
import { Search } from 'lucide-react';
import { useId, useMemo, useState } from 'react';
import { renderIcon } from '@/utils/icons';
import type { FlatMenu } from '@/utils/menu';

/** 最多列出的结果数 */
const MAX_RESULTS = 20;

/** 按标题子串（忽略大小写）过滤可见菜单页；空关键字返回空 */
export function filterMenus(pages: readonly FlatMenu[], keyword: string): FlatMenu[] {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    return pages.filter((p) => p.visible && p.title.toLowerCase().includes(q)).slice(0, MAX_RESULTS);
}

interface MenuSearchProps {
    pages: readonly FlatMenu[];
    onSelect: (page: FlatMenu) => void;
}

/**
 * 侧边栏菜单搜索（偏好 showMenuSearch）：输入即按标题过滤，↑↓ 选择、回车或点击跳转，Esc 清空。
 * 与 mono4ts 的差异：mono4ts 是顶栏按钮 + Ctrl+K 命令面板；这里是侧边栏里的输入框 + 下拉结果。
 */
export function MenuSearch({ pages, onSelect }: MenuSearchProps) {
    const [keyword, setKeyword] = useState('');
    const [active, setActive] = useState(0);
    const listId = useId();
    const results = useMemo(() => filterMenus(pages, keyword), [pages, keyword]);
    const open = keyword.trim() !== '';

    const choose = (page: FlatMenu | undefined) => {
        if (!page) return;
        setKeyword('');
        setActive(0);
        onSelect(page);
    };

    const onKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            if (!results.length) return;
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setActive((i) => (i + step + results.length) % results.length);
        } else if (e.key === 'Enter') {
            e.preventDefault();
            choose(results[Math.min(active, results.length - 1)]);
        } else if (e.key === 'Escape') {
            setKeyword('');
        }
    };

    return (
        <div className="admin-menu-search">
            <Input
                size="small"
                prefix={<Search size={14} />}
                placeholder="搜索菜单"
                aria-label="搜索菜单"
                aria-controls={listId}
                aria-expanded={open}
                role="combobox"
                showClear
                value={keyword}
                onChange={(v) => {
                    setKeyword(v);
                    setActive(0);
                }}
                onKeyDown={onKeyDown}
            />
            {open && (
                <ul className="admin-menu-search__results" id={listId} role="listbox" aria-label="菜单搜索结果">
                    {results.length === 0 && <li className="admin-menu-search__empty">没有匹配的菜单</li>}
                    {results.map((p, i) => (
                        <li
                            key={p.id}
                            role="option"
                            aria-selected={i === active}
                            className={`admin-menu-search__item${i === active ? ' admin-menu-search__item--active' : ''}`}
                            onMouseEnter={() => setActive(i)}
                            // mousedown 抢在输入框失焦之前，避免点击落空
                            onMouseDown={(e) => {
                                e.preventDefault();
                                choose(p);
                            }}
                        >
                            <span className="admin-menu-search__icon">{renderIcon(p.icon, 14)}</span>
                            <span className="admin-menu-search__title">{p.title}</span>
                            {p.parents.length > 0 && <span className="admin-menu-search__path">{p.parents.join(' / ')}</span>}
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
