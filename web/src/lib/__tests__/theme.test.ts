import { afterEach, describe, expect, it, vi } from 'vitest';
import { applyColorMode, bootstrapTheme, DEFAULT_THEME, loadThemePrefs, resolveIsDark, saveThemePrefs, THEME_STORAGE_KEY } from '../theme';

function stubPrefersDark(dark: boolean) {
    vi.stubGlobal('matchMedia', (query: string) => ({
        matches: query === '(prefers-color-scheme: dark)' ? dark : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
    }));
}

describe('theme 偏好持久化', () => {
    afterEach(() => {
        vi.restoreAllMocks();
        vi.unstubAllGlobals();
        document.body.removeAttribute('theme-mode');
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('没有存储时默认 light + 默认主色', () => {
        expect(loadThemePrefs()).toEqual({ mode: 'light', color: 'default' });
        expect(DEFAULT_THEME).toEqual({ mode: 'light', color: 'default' });
    });

    it('读写往返，键名为 weiran_theme', () => {
        saveThemePrefs({ mode: 'dark', color: '#abcdef' });
        expect(JSON.parse(localStorage.getItem(THEME_STORAGE_KEY) ?? '')).toEqual({ mode: 'dark', color: '#abcdef' });
        expect(THEME_STORAGE_KEY).toBe('weiran_theme');
        expect(loadThemePrefs()).toEqual({ mode: 'dark', color: '#abcdef' });
    });

    it('JSON 损坏时回落默认值', () => {
        localStorage.setItem(THEME_STORAGE_KEY, '{oops');
        expect(loadThemePrefs()).toEqual(DEFAULT_THEME);
        localStorage.setItem(THEME_STORAGE_KEY, 'null');
        expect(loadThemePrefs()).toEqual(DEFAULT_THEME);
    });

    it('字段非法时逐字段回落', () => {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'purple', color: 'blue' }));
        expect(loadThemePrefs()).toEqual({ mode: 'light', color: 'blue' });
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify({ mode: 'system', color: 123 }));
        expect(loadThemePrefs()).toEqual({ mode: 'system', color: 'default' });
    });

    it('localStorage 读写抛错时不外抛', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('SecurityError');
        });
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('QuotaExceededError');
        });
        expect(loadThemePrefs()).toEqual(DEFAULT_THEME);
        expect(() => saveThemePrefs({ mode: 'dark', color: 'blue' })).not.toThrow();
    });

    it('resolveIsDark：system 跟随系统偏好', () => {
        expect(resolveIsDark('light', true)).toBe(false);
        expect(resolveIsDark('dark', false)).toBe(true);
        expect(resolveIsDark('system', true)).toBe(true);
        expect(resolveIsDark('system', false)).toBe(false);
    });

    it('applyColorMode 切换 Semi 的 body[theme-mode] 入口', () => {
        applyColorMode(true);
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(document.body.style.colorScheme).toBe('dark');
        applyColorMode(false);
        expect(document.body.hasAttribute('theme-mode')).toBe(false);
        expect(document.body.style.colorScheme).toBe('light');
    });

    it('bootstrapTheme：挂载前按已存偏好应用，system 模式读系统偏好', () => {
        stubPrefersDark(true);
        saveThemePrefs({ mode: 'system', color: 'blue' });
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
});
