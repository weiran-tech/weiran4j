import type { MenuNode } from '@/types/api';
import { hasPageComponent } from './page-registry';

/** 由菜单节点得到的一条前端路由 */
export interface MenuRoute {
    id: number;
    /** 以 `/` 开头的绝对路径 */
    path: string;
    title: string;
    icon: string | null;
    component: string | null;
    visible: boolean;
    /** component 能在 page-registry 找到；否则渲染「页面不存在」占位 */
    resolved: boolean;
}

export function normalizePath(path: string): string {
    const p = path.trim();
    if (!p) return '/';
    const withSlash = p.startsWith('/') ? p : `/${p}`;
    return withSlash.length > 1 ? withSlash.replace(/\/+$/, '') : withSlash;
}

/**
 * 菜单树 → 路由表。
 * 只取 type=menu、启用、非外链、有 path 的节点；visible=false 的也注册（只是不在侧边栏显示）。
 * 同一路径出现多次时保留第一个。
 */
export function menusToRoutes(menus: readonly MenuNode[]): MenuRoute[] {
    const routes: MenuRoute[] = [];
    const seen = new Set<string>();
    const walk = (nodes: readonly MenuNode[]) => {
        for (const m of nodes) {
            if (m.status === 'enabled' && m.type === 'menu' && !m.isExternal && m.path) {
                const path = normalizePath(m.path);
                if (!seen.has(path)) {
                    seen.add(path);
                    routes.push({
                        id: m.id,
                        path,
                        title: m.title,
                        icon: m.icon,
                        component: m.component,
                        visible: m.visible,
                        resolved: hasPageComponent(m.component),
                    });
                }
            }
            if (m.children?.length) walk(m.children);
        }
    };
    walk(menus);
    return routes;
}

/** 从根到命中节点的链路（面包屑用）；未命中返回空数组 */
export function findMenuTrail(menus: readonly MenuNode[], path: string): MenuNode[] {
    const target = normalizePath(path);
    for (const m of menus) {
        if (m.type === 'menu' && m.path && normalizePath(m.path) === target) return [m];
        if (m.children?.length) {
            const sub = findMenuTrail(m.children, target);
            if (sub.length) return [m, ...sub];
        }
    }
    return [];
}

/** 通用树遍历：返回扁平列表 */
export function flattenTree<T extends { children?: T[] | null }>(nodes: readonly T[]): T[] {
    const out: T[] = [];
    const walk = (list: readonly T[]) => {
        for (const n of list) {
            out.push(n);
            if (n.children?.length) walk(n.children);
        }
    };
    walk(nodes);
    return out;
}

/** 去掉空 children，避免 Semi Table 给叶子节点画展开按钮 */
export function pruneEmptyChildren<T extends { children?: T[] | null }>(nodes: readonly T[]): T[] {
    return nodes.map((n) => {
        const { children, ...rest } = n;
        if (children?.length) return { ...rest, children: pruneEmptyChildren(children) } as T;
        return rest as T;
    });
}

/** 收集某节点自身及其全部后代 id（上级选择器里禁选，防止把节点挂到自己后代下） */
export function collectSubtreeIds<T extends { id: number; children?: T[] | null }>(
    nodes: readonly T[],
    rootId: number,
): Set<number> {
    const ids = new Set<number>();
    const walk = (list: readonly T[], inside: boolean) => {
        for (const n of list) {
            const hit = inside || n.id === rootId;
            if (hit) ids.add(n.id);
            if (n.children?.length) walk(n.children, hit);
        }
    };
    walk(nodes, false);
    return ids;
}

/**
 * 分配菜单权限的勾选联动（Tree 用 unRelated 模式，自己决定关系）：
 * - 勾选一个节点：连带勾上它的全部后代与全部祖先（祖先目录不勾，侧边栏就挂不出子菜单）；
 * - 取消一个节点：连带取消它的全部后代，祖先保持不变。
 */
export function applyMenuCheck(nodes: readonly MenuNode[], prevIds: readonly number[], nextIds: readonly number[]): number[] {
    const parentOf = new Map<number, number>();
    const childrenOf = new Map<number, MenuNode[]>();
    for (const n of flattenTree(nodes)) {
        parentOf.set(n.id, n.parentId);
        childrenOf.set(n.id, n.children ?? []);
    }
    const descendants = (id: number): number[] => flattenTree(childrenOf.get(id) ?? []).map((c) => c.id);

    const prev = new Set(prevIds);
    const next = new Set(nextIds);
    const result = new Set(nextIds);

    for (const id of next) {
        if (prev.has(id)) continue;
        descendants(id).forEach((d) => result.add(d));
        let p = parentOf.get(id);
        while (p !== undefined && p !== 0 && parentOf.has(p)) {
            result.add(p);
            p = parentOf.get(p);
        }
    }
    for (const id of prev) {
        if (next.has(id)) continue;
        descendants(id).forEach((d) => result.delete(d));
    }
    return [...result];
}
