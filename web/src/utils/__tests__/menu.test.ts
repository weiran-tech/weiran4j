import { describe, expect, it } from 'vitest';
import type { MenuNode } from '@/types/api';
import { applyMenuCheck, collectSubtreeIds, findMenuTrail, menusToRoutes, normalizePath } from '../menu';

function node(partial: Partial<MenuNode> & Pick<MenuNode, 'id' | 'title' | 'type'>): MenuNode {
    return {
        parentId: 0,
        path: null,
        component: null,
        icon: null,
        permission: null,
        sort: 0,
        visible: true,
        keepAlive: false,
        isExternal: false,
        status: 'enabled',
        children: [],
        ...partial,
    };
}

const tree: MenuNode[] = [
    node({ id: 1, title: '首页', type: 'menu', path: '/dashboard', component: 'dashboard/DashboardPage' }),
    node({
        id: 2,
        title: '系统管理',
        type: 'directory',
        path: '/system',
        children: [
            node({
                id: 3,
                parentId: 2,
                title: '用户管理',
                type: 'menu',
                path: '/system/users',
                component: 'system/users/UsersPage',
                children: [node({ id: 100, parentId: 3, title: '新增用户', type: 'button', permission: 'system:user:create' })],
            }),
            node({ id: 4, parentId: 2, title: '隐藏页', type: 'menu', path: 'system/hidden/', component: 'system/roles/RolesPage', visible: false }),
            node({ id: 5, parentId: 2, title: '未实现', type: 'menu', path: '/system/todo', component: 'system/todo/TodoPage' }),
            node({ id: 6, parentId: 2, title: '已禁用', type: 'menu', path: '/system/off', component: 'system/menus/MenusPage', status: 'disabled' }),
            node({ id: 7, parentId: 2, title: '外链', type: 'menu', path: 'https://example.com', isExternal: true }),
        ],
    }),
];

describe('menusToRoutes', () => {
    const routes = menusToRoutes(tree);

    it('只把启用、非外链的 type=menu 转成路由，按树序展开', () => {
        expect(routes.map((r) => r.id)).toEqual([1, 3, 4, 5]);
    });

    it('路径归一化为以 / 开头、无尾斜杠', () => {
        expect(routes.find((r) => r.id === 4)?.path).toBe('/system/hidden');
        expect(normalizePath('a/b/')).toBe('/a/b');
        expect(normalizePath('')).toBe('/');
    });

    it('visible=false 也注册路由', () => {
        expect(routes.find((r) => r.id === 4)).toMatchObject({ visible: false, resolved: true });
    });

    it('组件找不到时 resolved=false（渲染占位而不是崩溃）', () => {
        expect(routes.find((r) => r.id === 5)?.resolved).toBe(false);
        expect(routes.find((r) => r.id === 3)?.resolved).toBe(true);
    });
});

describe('findMenuTrail', () => {
    it('返回从根到当前菜单的链路', () => {
        expect(findMenuTrail(tree, '/system/users').map((m) => m.title)).toEqual(['系统管理', '用户管理']);
    });
    it('未命中返回空数组', () => {
        expect(findMenuTrail(tree, '/nope')).toEqual([]);
    });
});

describe('collectSubtreeIds', () => {
    it('包含自身与全部后代', () => {
        expect([...collectSubtreeIds(tree, 2)].sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 100]);
        expect([...collectSubtreeIds(tree, 3)]).toEqual([3, 100]);
    });
});

describe('applyMenuCheck', () => {
    it('勾选按钮时连带勾上菜单与目录', () => {
        expect(applyMenuCheck(tree, [], [100]).sort((a, b) => a - b)).toEqual([2, 3, 100]);
    });
    it('勾选菜单时连带勾上其按钮', () => {
        expect(applyMenuCheck(tree, [], [3]).sort((a, b) => a - b)).toEqual([2, 3, 100]);
    });
    it('取消菜单时连带取消其按钮，保留祖先', () => {
        expect(applyMenuCheck(tree, [2, 3, 100], [2, 100]).sort((a, b) => a - b)).toEqual([2]);
    });
});
