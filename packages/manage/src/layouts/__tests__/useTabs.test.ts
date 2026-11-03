import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TABS_STORAGE_KEY } from '@/hooks/useAuth';
import { initTabsState, readTabs, trimTabs, useTabs, visitTab, type TabsOptions, type TabsState } from '../useTabs';

const OPTS: TabsOptions = { enabled: true, keep: true, maxCount: 20, evictPolicy: 'fifo', insertPolicy: 'append' };

/** 依次访问一串页面（标题取路径） */
function visitAll(state: TabsState, keys: string[], opts: TabsOptions = OPTS): TabsState {
    return keys.reduce((s, k) => visitTab(s, k, k, null, opts), state);
}

const keysOf = (s: TabsState) => s.tabs.map((t) => t.key);

describe('多页签：存储', () => {
    it('首页始终在第一个；从 sessionStorage 恢复其余页签（兼容只有 key/title 的旧格式）', () => {
        sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify([{ key: '/system/users', title: '用户管理' }]));
        expect(readTabs().map((t) => t.key)).toEqual(['/dashboard', '/system/users']);
        expect(readTabs()[1]).toMatchObject({ opened: 1, used: 1, icon: null });
    });

    it('存储损坏时回到只有首页', () => {
        sessionStorage.setItem(TABS_STORAGE_KEY, '{oops');
        expect(keysOf(initTabsState(true))).toEqual(['/dashboard']);
    });

    it('keepTabs=false：不恢复存储里的页签', () => {
        sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify([{ key: '/a', title: 'A' }]));
        expect(keysOf(initTabsState(false))).toEqual(['/dashboard']);
    });

    it('useTabs：keep=true 写 sessionStorage，keep=false 删除', () => {
        const { rerender } = renderHook(({ keep }) => useTabs('/a', 'A', null, { ...OPTS, keep }), { initialProps: { keep: true } });
        expect(sessionStorage.getItem(TABS_STORAGE_KEY)).toContain('/a');
        rerender({ keep: false });
        expect(sessionStorage.getItem(TABS_STORAGE_KEY)).toBeNull();
    });
});

describe('多页签：访问', () => {
    it('新页追加、已存在不变（引用相同）、无标题不加', () => {
        const base = initTabsState(false);
        const added = visitTab(base, '/system/roles', '角色管理', 'Shield', OPTS);
        expect(keysOf(added)).toEqual(['/dashboard', '/system/roles']);
        expect(added.tabs[1]?.icon).toBe('Shield');
        expect(visitTab(added, '/system/roles', '角色管理', 'Shield', OPTS)).toBe(added);
        expect(visitTab(added, '/unknown', null, null, OPTS)).toBe(added);
    });

    it('insert-next：新页签插在当前页签之后', () => {
        const opts: TabsOptions = { ...OPTS, insertPolicy: 'insert-next' };
        let s = visitAll(initTabsState(false), ['/a', '/b', '/c'], opts);
        expect(keysOf(s)).toEqual(['/dashboard', '/a', '/b', '/c']);
        s = visitAll(s, ['/a', '/x'], opts);
        expect(keysOf(s)).toEqual(['/dashboard', '/a', '/x', '/b', '/c']);
    });

    it('append：新页签总在末尾', () => {
        const s = visitAll(initTabsState(false), ['/a', '/b', '/a', '/x']);
        expect(keysOf(s)).toEqual(['/dashboard', '/a', '/b', '/x']);
    });
});

describe('多页签：上限与淘汰', () => {
    it('FIFO：超限关掉最早打开的（不管最近是否用过），并记录被关的页签', () => {
        const opts: TabsOptions = { ...OPTS, maxCount: 3 };
        let s = visitAll(initTabsState(false), ['/a', '/b', '/a'], opts);
        s = visitTab(s, '/c', '/c', null, opts);
        expect(keysOf(s)).toEqual(['/dashboard', '/b', '/c']);
        expect(s.evicted?.map((t) => t.key)).toEqual(['/a']);
    });

    it('LRU：超限关掉最久没激活的', () => {
        const opts: TabsOptions = { ...OPTS, maxCount: 3, evictPolicy: 'lru' };
        let s = visitAll(initTabsState(false), ['/a', '/b', '/a'], opts);
        s = visitTab(s, '/c', '/c', null, opts);
        expect(keysOf(s)).toEqual(['/dashboard', '/a', '/c']);
        expect(s.evicted?.map((t) => t.key)).toEqual(['/b']);
    });

    it('首页与当前页永不淘汰；上限调小时一次裁到位', () => {
        const s = visitAll(initTabsState(false), ['/a', '/b', '/c', '/d']);
        const { tabs, evicted } = trimTabs(s.tabs, 2, 'fifo', '/a');
        expect(tabs.map((t) => t.key)).toEqual(['/dashboard', '/a']);
        expect(evicted.map((t) => t.key)).toEqual(['/b', '/c', '/d']);
        expect(trimTabs(s.tabs, 20, 'fifo', '/a').tabs).toBe(s.tabs);
    });

    it('useTabs：maxCount 变小后立即裁剪', () => {
        sessionStorage.setItem(
            TABS_STORAGE_KEY,
            JSON.stringify(['/a', '/b', '/c', '/d', '/e'].map((key) => ({ key, title: key }))),
        );
        const { result, rerender } = renderHook(({ max }) => useTabs('/e', '/e', null, { ...OPTS, maxCount: max }), {
            initialProps: { max: 20 },
        });
        expect(result.current.tabs).toHaveLength(6);
        rerender({ max: 5 });
        expect(result.current.tabs.map((t) => t.key)).toEqual(['/dashboard', '/b', '/c', '/d', '/e']);
    });

    it('useTabs：enabled=false 时不记录访问', () => {
        const { result } = renderHook(() => useTabs('/a', 'A', null, { ...OPTS, enabled: false }));
        expect(result.current.tabs.map((t) => t.key)).toEqual(['/dashboard']);
    });
});
