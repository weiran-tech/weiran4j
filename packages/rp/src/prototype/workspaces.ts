import type { MenuNode } from '@/types/api';
import { currentRelease, currentVersion, releases, type Release } from './catalog';
import { routeVersion } from './runtime';
import { globalPath } from '../../prototype/routes.mjs';

export const workspaces = [
    { id: 'collaboration', title: '版本改动', path: '/rp/versions' },
    { id: 'manage', title: '管理端产品', path: '/manage' },
    { id: 'mobile', title: '手机端产品', path: '/rp/mobile' },
] as const;
export type Workspace = typeof workspaces[number]['id'];
export function workspaceFor(path: string, search = ''): Workspace {
    if (path === '/rp/mobile') return new URLSearchParams(search).get('library') === '1' || new URLSearchParams(search).get('page') === 'mobile:mobile-form' ? 'manage' : 'mobile';
    if (path === '/rp/components' || path.startsWith('/manage/demo/')) return 'manage';
    if (globalPath(path) !== null || ['/rp/versions', '/rp/workflow', '/rp/editor', '/rp/scenes', '/rp/demo'].includes(path)) return 'collaboration';
    return 'manage';
}
/** 只投影可见菜单；完整菜单仍负责动态路由、权限、缓存和全局搜索。 */
export type ReadingScope = 'version' | 'all';
export function readingScope(search = ''): ReadingScope { return new URLSearchParams(search).get('scope') === 'all' ? 'all' : 'version'; }
export function readingRelease(search = ''): Release | undefined {
    const version = routeVersion || new URLSearchParams(search).get('version');
    return version ? releases.find((release) => release.id === version) : currentRelease;
}
const removedEntry = (path: string) => path === '/rp/components' || path === '/manage/demo' || path.startsWith('/manage/demo/');
export function workspaceMenus(menus: MenuNode[], workspace: Workspace, scope: ReadingScope = 'all', release?: Release, globalOnly = false): MenuNode[] {
    if (workspace === 'collaboration') {
        const leaves = (nodes: MenuNode[]): MenuNode[] => nodes.flatMap((node) => node.children?.length ? leaves(node.children) : [node]);
        return leaves(menus).filter((node) => ['/rp', '/rp/demo'].includes(node.path || '')).map((node) => ({ ...node, title: node.path === '/rp' ? '协作' : '原型演示' }));
    }
    return menus.flatMap((node) => {
        if (removedEntry(node.path || '')) return [];
        if (node.children?.length) {
            const children = workspaceMenus(node.children, workspace, scope, release, globalOnly);
            return children.length ? [{ ...node, title: node.path === '/rp/navigation' ? ({ collaboration: '版本与评审', manage: '业务交互示例', mobile: '手机端页面' } as const)[workspace] : node.title, children }] : [];
        }
        if (!node.path || workspaceFor(node.path) !== workspace) return [];
        if (globalOnly && globalPath(node.path) === null) return [];
        if (node.path === '/rp/scenes') return [];
        // 历史完整产品由快照提供菜单，不能展示当前构建的业务目录。
        if (scope === 'all' && workspace === 'manage' && release && release.id !== currentVersion && node.path !== '/manage') return [];
        if (scope === 'version' && node.path !== '/manage') {
            const related = release?.changes.some((change) => workspace === 'mobile'
                ? change.platform === 'mobile' && change.pageId !== 'mobile-form' && change.type !== 'remove'
                : change.platform === 'manage' && change.type !== 'remove' && (change.nextPage ?? change.page) === node.path);
            if (!related) return [];
        }
        return [node];
    }).sort((a, b) => Number(['/manage', '/rp/components'].includes(b.path || '')) - Number(['/manage', '/rp/components'].includes(a.path || '')));
}
/** 页面专属 change/review 不跨页沿用，阅读场景及版本保持。 */
export function readingPath(path: string, search = ''): string {
    const global = globalPath(path);
    if (global !== null) return global;
    const url = new URL(path, 'https://prototype.local');
    const context = new URLSearchParams(search);
    for (const key of ['version', 'scope', 'scene', 'step', 'scenario']) {
        const value = context.get(key);
        if (value && !url.searchParams.has(key)) url.searchParams.set(key, value);
    }
    // 历史业务页统一从版本中心读取固定快照，不把当前运行页面冒充历史页面。
    const version = routeVersion || url.searchParams.get('version');
    if (routeVersion) url.searchParams.delete('version');
    if (version && version !== currentVersion && url.pathname === '/manage') url.pathname = '/rp/manage';
    if (version && version !== currentVersion && workspaceFor(url.pathname) === 'manage' && !['/manage', '/rp/manage', '/rp/components'].includes(url.pathname)) {
        const change = releases.find((release) => release.id === version)?.changes.find((item) => item.page === url.pathname || item.nextPage === url.pathname);
        url.pathname = '/rp/versions'; url.hash = '';
        if (change) url.searchParams.set('change', change.id);
    }
    return url.pathname + url.search + url.hash;
}
