import { describe, expect, it } from 'vitest';
import { hasPageComponent, lazyPageComponent, normalizeComponentPath, resolvePageLoader } from '../page-registry';

/** 契约 §5 种子菜单的全部 component，前端必须都能解析 */
const SEED_COMPONENTS = [
    'dashboard/DashboardPage',
    'system/users/UsersPage',
    'system/roles/RolesPage',
    'system/menus/MenusPage',
    'system/dicts/DictsPage',
    'system/configs/ConfigsPage',
    'system/sms/SmsConfigsPage',
    'logs/LoginLogsPage',
    'logs/OperationLogsPage',
    'system/media-library',
    'system/security/SecuritySettingsPage',
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

    // 这条用例要真正 import 一个页面模块（连带 Semi UI 与整张 glob 图），
    // 在 jsdom 下约 17–18s；并发跑全量时很容易顶到 20s 默认上限，故单独放宽。
    it('loader 导出默认组件', async () => {
        const mod = await resolvePageLoader('not-found/NotFoundPage')!();
        expect(typeof mod.default).toBe('function');
    }, 60_000);
});
