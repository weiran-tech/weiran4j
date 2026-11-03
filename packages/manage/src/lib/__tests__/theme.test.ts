import { afterEach, describe, expect, it } from 'vitest';
import { applyColorMode, applyTheme, isThemeMode, resolveIsDark } from '../theme';

describe('theme 纯函数', () => {
    afterEach(() => {
        document.body.removeAttribute('theme-mode');
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('isThemeMode 只认 light / dark / system', () => {
        expect(isThemeMode('system')).toBe(true);
        expect(isThemeMode('purple')).toBe(false);
        expect(isThemeMode(1)).toBe(false);
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

    it('applyTheme：明暗 + 主色一起写', () => {
        applyTheme('system', 'blue', true);
        expect(document.body.getAttribute('theme-mode')).toBe('dark');
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#618bff');
    });
});
