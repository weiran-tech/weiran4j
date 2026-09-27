import { applyThemeColor } from './theme-color';

/**
 * 明暗模式与主题应用的纯函数。
 * 状态源是偏好（`hooks/usePreferences` 的 colorMode / themeColor），存储见 `lib/preferences-storage.ts`。
 */

/** light / dark 固定；system 跟随系统 prefers-color-scheme */
export type ThemeMode = 'light' | 'dark' | 'system';

export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

export function isThemeMode(v: unknown): v is ThemeMode {
    return typeof v === 'string' && (THEME_MODES as readonly string[]).includes(v);
}

export function systemPrefersDark(): boolean {
    return typeof globalThis.matchMedia === 'function' && globalThis.matchMedia(SYSTEM_DARK_QUERY).matches;
}

export function resolveIsDark(mode: ThemeMode, prefersDark: boolean): boolean {
    return mode === 'dark' || (mode === 'system' && prefersDark);
}

/** 切换 Semi 的官方暗色入口 body[theme-mode='dark']，并同步 color-scheme（滚动条、表单控件） */
export function applyColorMode(isDark: boolean): void {
    if (isDark) {
        document.body.setAttribute('theme-mode', 'dark');
    } else {
        document.body.removeAttribute('theme-mode');
    }
    document.body.style.colorScheme = isDark ? 'dark' : 'light';
}

export function applyTheme(mode: ThemeMode, color: string, prefersDark: boolean): void {
    const isDark = resolveIsDark(mode, prefersDark);
    applyColorMode(isDark);
    applyThemeColor(color, isDark);
}
