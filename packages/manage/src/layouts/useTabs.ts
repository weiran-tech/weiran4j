import { Toast } from '@douyinfe/semi-ui';
import { useCallback, useEffect, useState } from 'react';
import { HOME_PATH } from '@/config';
import { TABS_STORAGE_KEY } from '@/hooks/useAuth';
import type { UserPreferences } from '@/hooks/usePreferences';

export interface TabItem {
    key: string;
    title: string;
    /** 菜单图标（lucide 名），偏好 showTabIcon 开启时显示 */
    icon?: string | null;
    /** 打开顺序（FIFO 淘汰依据），单调递增 */
    opened: number;
    /** 最近一次激活的顺序（LRU 淘汰依据），单调递增 */
    used: number;
}

/** 页签相关偏好 */
export interface TabsOptions {
    enabled: boolean;
    keep: boolean;
    maxCount: number;
    evictPolicy: UserPreferences['tabEvictPolicy'];
    insertPolicy: UserPreferences['openTabBehavior'];
}

export interface TabsState {
    tabs: TabItem[];
    /** 最近一次访问的页签（insert-next 的插入锚点） */
    active: string;
    /** 顺序号发号器：用计数而不是时间戳，渲染期计算保持纯函数 */
    seq: number;
    /** 本次变更因超限被关掉的页签（提示用） */
    evicted: TabItem[] | null;
    /**
     * 刚被关掉的当前页。关闭后的跳转（React Router 的 navigate 走 transition）晚于这次 setState 生效，
     * 期间 URL 还停在它上面，不挡住的话渲染期同步会立刻把它加回来。
     */
    closing: string | null;
}

const HOME_TAB: TabItem = { key: HOME_PATH, title: '首页', opened: 0, used: 0 };

function isTabLike(t: unknown): t is Pick<TabItem, 'key' | 'title'> & Partial<TabItem> {
    return typeof t === 'object' && t !== null && typeof (t as TabItem).key === 'string' && typeof (t as TabItem).title === 'string';
}

/** 从 sessionStorage 恢复页签；数据损坏时回到只有首页。兼容只有 key/title 的旧格式 */
export function readTabs(): TabItem[] {
    try {
        const raw = sessionStorage.getItem(TABS_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!Array.isArray(parsed)) return [HOME_TAB];
        const tabs = parsed
            .filter(isTabLike)
            .filter((t) => t.key !== HOME_PATH)
            .map((t, i): TabItem => ({
                key: t.key,
                title: t.title,
                icon: typeof t.icon === 'string' ? t.icon : null,
                opened: typeof t.opened === 'number' ? t.opened : i + 1,
                used: typeof t.used === 'number' ? t.used : i + 1,
            }));
        return [HOME_TAB, ...tabs];
    } catch {
        return [HOME_TAB];
    }
}

function writeTabs(tabs: TabItem[], keep: boolean) {
    try {
        if (keep) sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
        else sessionStorage.removeItem(TABS_STORAGE_KEY);
    } catch {
        // 隐私模式下写入失败不影响使用
    }
}

export function initTabsState(keep: boolean): TabsState {
    const tabs = keep ? readTabs() : [HOME_TAB];
    const seq = tabs.reduce((max, t) => Math.max(max, t.opened, t.used), 0);
    return { tabs, active: HOME_PATH, seq, evicted: null, closing: null };
}

/**
 * 超过上限时按策略淘汰：首页与 `protectedKey`（当前页）不淘汰。
 * fifo 淘汰最早打开的，lru 淘汰最久没激活的。未超限时原样返回（引用不变）。
 */
export function trimTabs(
    tabs: TabItem[],
    maxCount: number,
    policy: TabsOptions['evictPolicy'],
    protectedKey: string,
): { tabs: TabItem[]; evicted: TabItem[] } {
    if (tabs.length <= maxCount) return { tabs, evicted: [] };
    const field = policy === 'lru' ? 'used' : 'opened';
    const candidates = tabs
        .filter((t) => t.key !== HOME_PATH && t.key !== protectedKey)
        .sort((a, b) => a[field] - b[field])
        .slice(0, tabs.length - maxCount);
    const drop = new Set(candidates.map((t) => t.key));
    return { tabs: tabs.filter((t) => !drop.has(t.key)), evicted: candidates };
}

/**
 * 进入一个页面：已开着的更新标题/图标并记一次激活，没开的按插入策略加入并按上限淘汰。
 * 无标题（未识别页面）或无需变化时返回原状态（引用不变）。
 */
export function visitTab(state: TabsState, key: string, title: string | null, icon: string | null, options: TabsOptions): TabsState {
    if (!title) return state;
    const idx = state.tabs.findIndex((t) => t.key === key);
    const current = state.tabs[idx];
    if (current) {
        const sameMeta = current.title === title && (current.icon ?? null) === icon;
        if (sameMeta && state.active === key) return state;
        const seq = state.active === key ? state.seq : state.seq + 1;
        const tabs = [...state.tabs];
        tabs[idx] = { ...current, title, icon, used: seq };
        return { ...state, tabs, active: key, seq, evicted: null };
    }
    const seq = state.seq + 1;
    const tab: TabItem = { key, title, icon, opened: seq, used: seq };
    let tabs: TabItem[];
    const anchor = state.tabs.findIndex((t) => t.key === state.active);
    if (options.insertPolicy === 'insert-next' && anchor >= 0) {
        tabs = [...state.tabs.slice(0, anchor + 1), tab, ...state.tabs.slice(anchor + 1)];
    } else {
        tabs = [...state.tabs, tab];
    }
    const trimmed = trimTabs(tabs, options.maxCount, options.evictPolicy, key);
    return { ...state, tabs: trimmed.tabs, active: key, seq, evicted: trimmed.evicted.length ? trimmed.evicted : null };
}

/**
 * 多页签状态。当前页签即 URL；这里只维护「开着哪些」。
 * 首页不可关闭。关闭当前页签时返回应跳转的目标 key，由调用方 navigate。
 * 上限、淘汰策略、插入位置、是否跨刷新保存都来自偏好（`options`）。
 */
export function useTabs(activeKey: string, activeTitle: string | null, activeIcon: string | null, options: TabsOptions) {
    const [state, setState] = useState<TabsState>(() => initTabsState(options.keep));

    // 渲染期同步当前页与上限（React 推荐的「根据 props 调整 state」写法，避免 effect 里 setState 造成二次提交）
    let next = state.closing !== null && state.closing !== activeKey ? { ...state, closing: null } : state;
    if (options.enabled && next.closing !== activeKey) next = visitTab(next, activeKey, activeTitle, activeIcon, options);
    const trimmed = trimTabs(next.tabs, options.maxCount, options.evictPolicy, activeKey);
    if (trimmed.tabs !== next.tabs) next = { ...next, tabs: trimmed.tabs, evicted: trimmed.evicted };
    if (next !== state) setState(next);

    const { tabs, evicted } = state;
    useEffect(() => writeTabs(tabs, options.keep), [tabs, options.keep]);

    useEffect(() => {
        if (evicted?.length) {
            Toast.info(`已达到最大页签数（${options.maxCount}），自动关闭了 ${evicted.map((t) => `「${t.title}」`).join('、')}`);
        }
        // 只在发生淘汰时提示一次；maxCount 变化本身不需要重提
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [evicted]);

    const close = useCallback(
        (key: string): string | null => {
            if (key === HOME_PATH) return null;
            const idx = tabs.findIndex((t) => t.key === key);
            if (idx < 0) return null;
            const rest = tabs.filter((t) => t.key !== key);
            setState((s) => ({
                ...s,
                tabs: s.tabs.filter((t) => t.key !== key),
                evicted: null,
                closing: key === activeKey ? key : s.closing,
            }));
            if (key !== activeKey) return null;
            return (rest[idx] ?? rest[idx - 1] ?? HOME_TAB).key;
        },
        [tabs, activeKey],
    );

    const closeOthers = useCallback(
        (key: string): string | null => {
            setState((s) => ({
                ...s,
                tabs: s.tabs.filter((t) => t.key === HOME_PATH || t.key === key),
                evicted: null,
                closing: activeKey === HOME_PATH || activeKey === key ? s.closing : activeKey,
            }));
            return key === activeKey ? null : key;
        },
        [activeKey],
    );

    const closeAll = useCallback((): string | null => {
        setState((s) => ({ ...s, tabs: [HOME_TAB], evicted: null, closing: activeKey === HOME_PATH ? s.closing : activeKey }));
        return activeKey === HOME_PATH ? null : HOME_PATH;
    }, [activeKey]);

    return { tabs, close, closeOthers, closeAll };
}
