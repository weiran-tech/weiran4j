import { describe, expect, it } from 'vitest';
import type { FlatMenu } from '@/utils/menu';
import { firstLeafKey } from '../AdminLayout';
import { filterMenus } from '../GlobalSearch';

const page = (id: number, title: string, visible = true, parents: string[] = []): FlatMenu => ({
    id,
    title,
    icon: null,
    path: `/p${id}`,
    isExternal: false,
    visible,
    keepAlive: false,
    parents,
});

describe('filterMenus', () => {
    const pages = [page(1, '用户管理'), page(2, 'Role 角色'), page(3, '隐藏的管理页', false)];

    it('按标题子串匹配、忽略大小写与首尾空白；不可见的页面不参与', () => {
        expect(filterMenus(pages, ' 管理 ').map((p) => p.id)).toEqual([1]);
        expect(filterMenus(pages, 'role').map((p) => p.id)).toEqual([2]);
    });

    it('也按目录标题匹配；排序：标题相等 > 前缀 > 包含 > 只命中目录', () => {
        const list = [page(1, '日志设置', true, ['系统管理']), page(2, '系统日志'), page(3, '日志'), page(4, '操作日志')];
        expect(filterMenus(list, '日志').map((p) => p.id)).toEqual([3, 1, 2, 4]);
        expect(filterMenus(list, '系统').map((p) => p.id)).toEqual([2, 1]);
    });

    it('空关键字不出结果', () => {
        expect(filterMenus(pages, '  ')).toEqual([]);
    });
});

describe('firstLeafKey', () => {
    it('跳过目录与外链，返回第一个内链页', () => {
        expect(
            firstLeafKey([
                { itemKey: 'external:https://x.com', text: '外链' },
                { itemKey: 'dir:9', text: '空目录', items: [] },
                { itemKey: 'dir:2', text: '目录', items: [{ itemKey: '/a', text: 'A' }] },
            ]),
        ).toBe('/a');
        expect(firstLeafKey([{ itemKey: 'external:https://x.com', text: '外链' }])).toBeNull();
    });
});
