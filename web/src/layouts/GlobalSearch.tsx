import { Modal } from '@douyinfe/semi-ui';
import { Clock, Hash, Search, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { renderIcon } from '@/utils/icons';
import type { FlatMenu } from '@/utils/menu';

/** 最多列出的搜索结果数 */
const MAX_RESULTS = 20;
/** 最近访问最多保留条数 */
const MAX_RECENT = 10;
export const RECENT_MENUS_STORAGE_KEY = 'weiran_recent_menus';

/**
 * 按标题 / 祖先目录标题子串（忽略大小写）过滤可见菜单页；空关键字返回空。
 * 排序：标题完全相等 > 标题前缀 > 标题包含 > 只命中目录，同档保持菜单顺序。
 */
export function filterMenus(pages: readonly FlatMenu[], keyword: string): FlatMenu[] {
    const q = keyword.trim().toLowerCase();
    if (!q) return [];
    const rank = (p: FlatMenu) => {
        const t = p.title.toLowerCase();
        if (t === q) return 0;
        if (t.startsWith(q)) return 1;
        if (t.includes(q)) return 2;
        return p.parents.some((d) => d.toLowerCase().includes(q)) ? 3 : -1;
    };
    return pages
        .filter((p) => p.visible)
        .map((p, index) => ({ p, index, score: rank(p) }))
        .filter((r) => r.score >= 0)
        .sort((a, b) => a.score - b.score || a.index - b.index)
        .slice(0, MAX_RESULTS)
        .map((r) => r.p);
}

function loadRecent(): number[] {
    try {
        const parsed: unknown = JSON.parse(localStorage.getItem(RECENT_MENUS_STORAGE_KEY) ?? '[]');
        return Array.isArray(parsed) ? parsed.filter((v): v is number => typeof v === 'number') : [];
    } catch {
        return [];
    }
}

function saveRecent(ids: number[]) {
    try {
        localStorage.setItem(RECENT_MENUS_STORAGE_KEY, JSON.stringify(ids));
    } catch {
        /* 存储不可用时只在本次会话内生效 */
    }
}

/** 最近访问的菜单页：当前路由命中可见菜单页时置顶记录，存 localStorage（同 zenith-admin，不走后端） */
export function useRecentMenus(pages: readonly FlatMenu[], pathname: string) {
    const [ids, setIds] = useState<number[]>(loadRecent);
    // 每个路由只记一次（渲染期按路由变化调整 state）：否则移除 / 清除后当前页会立刻被加回来
    const [recordedPath, setRecordedPath] = useState<string | null>(null);
    const current = pages.find((p) => p.visible && !p.isExternal && p.path === pathname);
    if (current && recordedPath !== pathname) {
        setRecordedPath(pathname);
        setIds((prev) => (prev[0] === current.id ? prev : [current.id, ...prev.filter((id) => id !== current.id)].slice(0, MAX_RECENT)));
    }

    useEffect(() => saveRecent(ids), [ids]);

    const recents = useMemo(
        () => ids.map((id) => pages.find((p) => p.id === id && p.visible)).filter((p): p is FlatMenu => p !== undefined),
        [ids, pages],
    );
    const remove = useCallback((id: number) => setIds((prev) => prev.filter((v) => v !== id)), []);
    const clear = useCallback(() => setIds([]), []);
    return { recents, remove, clear };
}

/** Ctrl+K（macOS 上 ⌘+K）：不带 Alt / Shift，避免与输入法、浏览器其它组合键冲突 */
function isSearchShortcut(e: KeyboardEvent): boolean {
    return (e.ctrlKey || e.metaKey) && !e.altKey && !e.shiftKey && e.key.toLowerCase() === 'k';
}

interface GlobalSearchProps {
    pages: readonly FlatMenu[];
    pathname: string;
    onSelect: (page: FlatMenu) => void;
}

/**
 * 全局搜索（偏好 showMenuSearch，移植自 zenith-admin 的 MenuSearchInput + MenuCommandPalette）：
 * 顶栏触发按钮 + Ctrl/⌘+K 打开命令面板；空关键字列最近访问，输入后按标题 / 目录过滤菜单，
 * ↑↓ 选择、回车或点击跳转、Esc 关闭。与 zenith 的差异：本项目没有业务数据搜索接口，只搜菜单，也不支持拼音。
 */
export function GlobalSearch({ pages, pathname, onSelect }: GlobalSearchProps) {
    const [open, setOpen] = useState(false);
    const [keyword, setKeyword] = useState('');
    const [active, setActive] = useState(0);
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const { recents, remove, clear } = useRecentMenus(pages, pathname);

    const showRecent = keyword.trim() === '';
    const results = useMemo(() => (showRecent ? recents : filterMenus(pages, keyword)), [showRecent, recents, pages, keyword]);

    const show = useCallback(() => {
        setKeyword('');
        setActive(0);
        setOpen(true);
    }, []);

    useEffect(() => {
        const onKeyDown = (e: KeyboardEvent) => {
            if (!isSearchShortcut(e)) return;
            e.preventDefault();
            if (open) setOpen(false);
            else show();
        };
        document.addEventListener('keydown', onKeyDown);
        return () => document.removeEventListener('keydown', onKeyDown);
    }, [open, show]);

    // Semi Modal 打开后会把焦点移到自身容器上，覆盖 autoFocus；等它移完再聚焦输入框（同 zenith-admin）
    useEffect(() => {
        if (!open) return undefined;
        const timer = setTimeout(() => inputRef.current?.focus(), 30);
        return () => clearTimeout(timer);
    }, [open]);

    useEffect(() => {
        listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView?.({ block: 'nearest' });
    }, [active]);

    const choose = (page: FlatMenu | undefined) => {
        if (!page) return;
        setOpen(false);
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
            setOpen(false);
        }
    };

    return (
        <>
            <button type="button" className="global-search-trigger" aria-label="全局搜索" title="全局搜索（Ctrl+K）" aria-expanded={open} onClick={show}>
                <Search size={16} strokeWidth={1.8} className="global-search-trigger__icon" />
                <span className="global-search-trigger__label">全局搜索</span>
                <kbd className="global-search-trigger__kbd">Ctrl K</kbd>
            </button>
            <Modal
                className="global-search-modal"
                visible={open}
                header={null}
                footer={null}
                closable={false}
                // 命令面板即开即关，不要进出场动画
                motion={false}
                onCancel={() => setOpen(false)}
                width={600}
                bodyStyle={{ padding: 0 }}
            >
                <div className="global-search">
                    <div className="global-search__input-row">
                        <Search size={17} className="global-search__input-icon" />
                        <input
                            ref={inputRef}
                            className="global-search__input"
                            placeholder="搜索菜单"
                            aria-label="全局搜索"
                            role="combobox"
                            aria-expanded
                            aria-controls="global-search-results"
                            aria-activedescendant={results[active] ? `global-search-option-${active}` : undefined}
                            value={keyword}
                            onChange={(e) => {
                                setKeyword(e.target.value);
                                setActive(0);
                            }}
                            onKeyDown={onKeyDown}
                        />
                        {keyword && (
                            <button type="button" className="global-search__clear" aria-label="清空" onClick={() => setKeyword('')}>
                                <X size={12} />
                            </button>
                        )}
                        <kbd className="global-search__kbd">ESC</kbd>
                    </div>
                    <div ref={listRef} className="global-search__list" id="global-search-results" role="listbox" aria-label="搜索结果">
                        {showRecent && recents.length > 0 && (
                            <div className="global-search__group">
                                <span>最近访问</span>
                                <button type="button" className="global-search__group-action" onClick={clear}>
                                    清除
                                </button>
                            </div>
                        )}
                        {!showRecent && results.length > 0 && <div className="global-search__group">菜单</div>}
                        {results.map((p, i) => (
                            <div key={p.id} className="global-search__row">
                                <div
                                    id={`global-search-option-${i}`}
                                    role="option"
                                    aria-selected={i === active}
                                    data-index={i}
                                    className={`global-search__item${i === active ? ' global-search__item--active' : ''}`}
                                    onMouseEnter={() => setActive(i)}
                                    // mousedown 抢在输入框失焦之前，避免点击落空
                                    onMouseDown={(e) => {
                                        e.preventDefault();
                                        choose(p);
                                    }}
                                >
                                    <span className="global-search__item-icon">
                                        {renderIcon(p.icon, 13) ?? (showRecent ? <Clock size={13} /> : <Hash size={13} />)}
                                    </span>
                                    <span className="global-search__item-text">
                                        <span className="global-search__item-title">{p.title}</span>
                                        {p.parents.length > 0 && <span className="global-search__item-path">{p.parents.join(' › ')}</span>}
                                    </span>
                                    {i === active && <kbd className="global-search__item-enter">↵</kbd>}
                                </div>
                                {showRecent && (
                                    <button
                                        type="button"
                                        className="global-search__remove"
                                        aria-label={`移除${p.title}`}
                                        title="移除最近访问"
                                        onClick={() => remove(p.id)}
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                        {showRecent && recents.length === 0 && <div className="global-search__empty">输入关键词搜索菜单</div>}
                        {!showRecent && results.length === 0 && <div className="global-search__empty">没有匹配的菜单</div>}
                    </div>
                    <div className="global-search__footer">
                        <span>
                            <kbd>↑↓</kbd> 选择
                        </span>
                        <span>
                            <kbd>↵</kbd> 跳转
                        </span>
                        <span>
                            <kbd>ESC</kbd> 关闭
                        </span>
                        <span className="global-search__footer-tip">
                            <kbd>Ctrl K</kbd> 快速打开
                        </span>
                    </div>
                </div>
            </Modal>
        </>
    );
}
