import { describe, expect, it } from 'vitest';
import { TABS_STORAGE_KEY } from '@/hooks/useAuth';
import { mergeTab, readTabs } from '../useTabs';

describe('多页签', () => {
    it('首页始终在第一个；从 sessionStorage 恢复其余页签', () => {
        sessionStorage.setItem(TABS_STORAGE_KEY, JSON.stringify([{ key: '/system/users', title: '用户管理' }]));
        expect(readTabs().map((t) => t.key)).toEqual(['/dashboard', '/system/users']);
    });

    it('存储损坏时回到只有首页', () => {
        sessionStorage.setItem(TABS_STORAGE_KEY, '{oops');
        expect(readTabs()).toEqual([{ key: '/dashboard', title: '首页' }]);
    });

    it('mergeTab：新页追加、已存在不变（引用相同）、无标题不加', () => {
        const base = readTabs();
        const added = mergeTab(base, '/system/roles', '角色管理');
        expect(added.map((t) => t.key)).toEqual(['/dashboard', '/system/roles']);
        expect(mergeTab(added, '/system/roles', '角色管理')).toBe(added);
        expect(mergeTab(added, '/unknown', null)).toBe(added);
    });
});
