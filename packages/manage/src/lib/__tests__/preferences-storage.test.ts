import { afterEach, describe, expect, it, vi } from 'vitest';
import { defaultPreferences, type UserPreferences } from '@/hooks/usePreferences';
import {
    bootstrapTheme,
    clearPreferences,
    LEGACY_THEME_STORAGE_KEY,
    loadPreferences,
    loadPreferencesOwner,
    PREFERENCES_OWNER_KEY,
    PREFERENCES_STORAGE_KEY,
    savePreferences,
} from '../preferences-storage';

function stubPrefersDark(dark: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? dark : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    }));
}

function stored(): Partial<UserPreferences> | null {
    const raw = localStorage.getItem(PREFERENCES_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Partial<UserPreferences>) : null;
}

describe('偏好本地缓存', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.removeAttribute('theme-mode');
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('键名为 weiran_preferences；没有存储时是默认值', () => {
        expect(PREFERENCES_STORAGE_KEY).toBe('weiran_preferences');
        expect(loadPreferences()).toEqual(defaultPreferences);
    });

    it('读写往返；clear 后回到默认', () => {
        savePreferences({ ...defaultPreferences, colorMode: 'dark', tablePageSize: 50 });
        expect(loadPreferences()).toMatchObject({ colorMode: 'dark', tablePageSize: 50 });
        clearPreferences();
        expect(loadPreferences()).toEqual(defaultPreferences);
    });

    it('JSON 损坏 / 非对象时回落默认值', () => {
        localStorage.setItem(PREFERENCES_STORAGE_KEY, '{oops');
        expect(loadPreferences()).toEqual(defaultPreferences);
        localStorage.setItem(PREFERENCES_STORAGE_KEY, '[1,2]');
        expect(loadPreferences()).toEqual(defaultPreferences);
    });

    it('非法字段逐项回落，缺失字段补默认', () => {
        localStorage.setItem(
            PREFERENCES_STORAGE_KEY,
            JSON.stringify({ colorMode: 'purple', themeColor: 'green', tabsMaxCount: 999, enableTabs: 'yes', showLogo: false }),
        );
        const prefs = loadPreferences();
        expect(prefs.colorMode).toBe('light');
        expect(prefs.themeColor).toBe('green');
        expect(prefs.tabsMaxCount).toBe(defaultPreferences.tabsMaxCount);
        expect(prefs.enableTabs).toBe(true);
        expect(prefs.showLogo).toBe(false);
        expect(prefs.sidebarWidth).toBe(defaultPreferences.sidebarWidth);
    });

    it('localStorage 读写抛错时不外抛', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        expect(loadPreferences()).toEqual(defaultPreferences);
        expect(() => savePreferences(defaultPreferences)).not.toThrow();
        expect(() => clearPreferences()).not.toThrow();
    });

    it('只有旧版 weiran_theme 时迁入偏好并删除旧键；default 主色存成 #0064FA', () => {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ mode: 'dark', color: 'default' }));
        const prefs = loadPreferences();
        expect(prefs).toMatchObject({ colorMode: 'dark', themeColor: '#0064FA' });
        expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
        expect(stored()).toMatchObject({ colorMode: 'dark', themeColor: '#0064FA' });
    });

    it('旧版主题的非法字段不迁移', () => {
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ mode: 'weird', color: 'green' }));
        expect(loadPreferences()).toMatchObject({ colorMode: 'light', themeColor: 'green' });
    });

    it('已有偏好时忽略旧版主题（但删除它）', () => {
        savePreferences({ ...defaultPreferences, colorMode: 'system' });
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ mode: 'dark', color: 'green' }));
        expect(loadPreferences()).toMatchObject({ colorMode: 'system', themeColor: '#0064FA' });
        expect(localStorage.getItem(LEGACY_THEME_STORAGE_KEY)).toBeNull();
    });

    it('bootstrapTheme：挂载前按偏好应用，system 模式读系统偏好', () => {
        stubPrefersDark(true);
        savePreferences({ ...defaultPreferences, colorMode: 'system', themeColor: 'blue' });
        bootstrapTheme();
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#618bff');
    });

    it('bootstrapTheme：没有存储时是浅色 + #0064FA', () => {
        stubPrefersDark(true);
        bootstrapTheme();
        expect(document.body.hasAttribute('theme-mode')).toBe(false);
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#0064FA');
    });

    it('bootstrapTheme：旧用户只有 weiran_theme 也不闪白', () => {
        stubPrefersDark(false);
        localStorage.setItem(LEGACY_THEME_STORAGE_KEY, JSON.stringify({ mode: 'dark', color: 'green' }));
        bootstrapTheme();
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#34d399');
    });

    it('归属：savePreferences 带 ownerId 记下、不带则清掉；clear 一并清；非法值读成 null', () => {
        savePreferences({ ...defaultPreferences }, 7);
        expect(loadPreferencesOwner()).toBe(7);
        savePreferences({ ...defaultPreferences });
        expect(localStorage.getItem(PREFERENCES_OWNER_KEY)).toBeNull();
        savePreferences({ ...defaultPreferences }, 7);
        clearPreferences();
        expect(loadPreferencesOwner()).toBeNull();
        localStorage.setItem(PREFERENCES_OWNER_KEY, 'abc');
        expect(loadPreferencesOwner()).toBeNull();
    });
});
