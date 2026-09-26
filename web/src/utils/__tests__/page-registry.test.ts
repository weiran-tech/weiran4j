import { describe, expect, it } from 'vitest';
import { hasPageComponent, lazyPageComponent, normalizeComponentPath, resolvePageLoader } from '../page-registry';

/** 契约 §5 种子菜单的全部 component，前端必须都能解析 */
const SEED_COMPONENTS = [
    'dashboard/DashboardPage',
    'system/users/UsersPage',
    'system/roles/RolesPage',
    'system/menus/MenusPage',
    'system/departments/DepartmentsPage',
    'system/dicts/DictsPage',
    'system/configs/ConfigsPage',
    'logs/LoginLogsPage',
    'logs/OperationLogsPage',
];

describe('page-registry', () => {
    it.each(SEED_COMPONENTS)('种子菜单组件 %s 可解析', (component) => {
        expect(hasPageComponent(component)).toBe(true);
    });

    it('容忍前导斜杠与 .tsx 后缀', () => {
        expect(normalizeComponentPath('/system/users/UsersPage.tsx')).toBe('system/users/UsersPage');
        expect(hasPageComponent('/system/users/UsersPage.tsx')).toBe(true);
    });

    it('不存在或为空时返回 null', () => {
        expect(resolvePageLoader('nope/MissingPage')).toBeNull();
        expect(resolvePageLoader('')).toBeNull();
        expect(resolvePageLoader(null)).toBeNull();
        expect(lazyPageComponent(undefined)).toBeNull();
    });

    it('不收录 __tests__ 下的文件', () => {
        expect(hasPageComponent('system/users/__tests__/UsersPage.test')).toBe(false);
    });

    it('lazy 组件按路径缓存，引用稳定', () => {
        expect(lazyPageComponent('system/roles/RolesPage')).toBe(lazyPageComponent('/system/roles/RolesPage.tsx'));
    });

    it('loader 导出默认组件', async () => {
        const mod = await resolvePageLoader('not-found/NotFoundPage')!();
        expect(typeof mod.default).toBe('function');
    });
});
