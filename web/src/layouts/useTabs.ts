import { useCallback, useEffect, useState } from 'react';
import { HOME_PATH } from '@/config';
import { TABS_STORAGE_KEY } from '@/hooks/useAuth';

export interface TabItem {
    key: string;
    title: string;
}

const HOME_TAB: TabItem = { key: HOME_PATH, title: '首页' };

/** 从 sessionStorage 恢复页签；数据损坏时回到只有首页 */
export function readTabs(): TabItem[] {
    try {
        const raw = sessionStorage.getItem(TABS_STORAGE_KEY);
        const parsed: unknown = raw ? JSON.parse(raw) : null;
        if (!Array.isArray(parsed)) return [HOME_TAB];
        const tabs = parsed.filter(
            (t): t is TabItem =>
                typeof t === 'object' && t !== null && typeof (t as TabItem).key === 'string' && typeof (t as TabItem).title === 'string',
        );
        return [HOME_TAB, ...tabs.filter((t) => t.key !== HOME_PATH)];
    } catch {
        return [HOME_TAB];
    }
}

function writeTabs(tabs: TabItem[]) {
    try {
        sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify(tabs));
    } catch {
        // 隐私模式下写入失败不影响使用
    }
}

/** 进入一个可识别的页面时加入/更新页签；无需变化时返回原数组（引用不变） */
export function mergeTab(tabs: TabItem[], key: string, title: string | null): TabItem[] {
    if (!title) return tabs;
    const idx = tabs.findIndex((t) => t.key === key);
    if (idx < 0) return [...tabs, { key, title }];
    if (tabs[idx]?.title === title) return tabs;
    const next = [...tabs];
    next[idx] = { key, title };
    return next;
}

/**
 * 多页签状态。当前页签即 URL；这里只维护「开着哪些」。
 * 首页不可关闭。关闭当前页签时返回应跳转的目标 key，由调用方 navigate。
 */
export function useTabs(activeKey: string, activeTitle: string | null) {
    const [tabs, setTabs] = useState<TabItem[]>(readTabs);

    // 渲染期同步当前页到页签（React 推荐的「根据 props 调整 state」写法，避免 effect 里 setState 造成二次提交）
    const merged = mergeTab(tabs, activeKey, activeTitle);
    if (merged !== tabs) setTabs(merged);

    useEffect(() => writeTabs(tabs), [tabs]);

    const close = useCallback(
        (key: string): string | null => {
            if (key === HOME_PATH) return null;
            const idx = tabs.findIndex((t) => t.key === key);
            if (idx < 0) return null;
            const next = tabs.filter((t) => t.key !== key);
            setTabs(next);
            if (key !== activeKey) return null;
            return (next[idx] ?? next[idx - 1] ?? HOME_TAB).key;
        },
        [tabs, activeKey],
    );

    const closeOthers = useCallback(
        (key: string): string | null => {
            setTabs((prev) => prev.filter((t) => t.key === HOME_PATH || t.key === key));
            return key === activeKey ? null : key;
        },
        [activeKey],
    );

    const closeAll = useCallback((): string | null => {
        setTabs([HOME_TAB]);
        return activeKey === HOME_PATH ? null : HOME_PATH;
    }, [activeKey]);

    return { tabs, close, closeOthers, closeAll };
}
