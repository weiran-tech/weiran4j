import { describe, expect, it } from 'vitest';
import { defaultPreferences, normalizePreferences } from '../usePreferences';

describe('偏好字段定义', () => {
    it('43 个字段（与 mono4ts 一致），本项目调整过的默认值', () => {
        expect(Object.keys(defaultPreferences)).toHaveLength(43);
        expect(defaultPreferences).toMatchObject({
            navLayout: 'vertical',
            enableTabs: true,
            tablePageSize: 20,
            themeColor: '#0064FA',
            colorMode: 'light',
        });
    });

    it('normalizePreferences：非对象回落默认，未知字段丢弃', () => {
        expect(normalizePreferences(null)).toEqual(defaultPreferences);
        expect(normalizePreferences('x')).toEqual(defaultPreferences);
        expect(normalizePreferences({ foo: 1 })).toEqual(defaultPreferences);
    });

    it('normalizePreferences：枚举、范围、主题色逐项校验', () => {
        const prefs = normalizePreferences({
            tableSize: 'huge',
            tabEvictPolicy: 'lru',
            sidebarWidth: 100,
            tabsMaxCount: 8,
            tablePageSize: 12.5,
            themeColor: 'not-a-color',
            contentWidth: 'fixed',
        });
        expect(prefs.tableSize).toBe('small');
        expect(prefs.tabEvictPolicy).toBe('lru');
        expect(prefs.sidebarWidth).toBe(240);
        expect(prefs.tabsMaxCount).toBe(8);
        expect(prefs.tablePageSize).toBe(20);
        expect(prefs.themeColor).toBe('#0064FA');
        expect(prefs.contentWidth).toBe('fixed');
    });
});
