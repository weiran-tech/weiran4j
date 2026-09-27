import { describe, expect, it } from 'vitest';
import type { FlatMenu } from '@/utils/menu';
import { firstLeafKey } from '../AdminLayout';
import { filterMenus } from '../MenuSearch';

const page = (id: number, title: string, visible = true): FlatMenu => ({
    id,
    title,
    icon: null,
    path: `/p${id}`,
    isExternal: false,
    visible,
    keepAlive: false,
    parents: [],
});

describe('filterMenus', () => {
    const pages = [page(1, '用户管理'), page(2, 'Role 角色'), page(3, '隐藏的管理页', false)];

    it('按标题子串匹配、忽略大小写与首尾空白；不可见的页面不参与', () => {
        expect(filterMenus(pages, ' 管理 ').map((p) => p.id)).toEqual([1]);
        expect(filterMenus(pages, 'role').map((p) => p.id)).toEqual([2]);
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
