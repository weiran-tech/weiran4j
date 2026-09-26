import { applyThemeColor, DEFAULT_THEME_COLOR, isValidThemeColor } from './theme-color';

/** light / dark 固定；system 跟随系统 prefers-color-scheme */
export type ThemeMode = 'light' | 'dark' | 'system';

export interface ThemePrefs {
    mode: ThemeMode;
    color: string;
}

export const THEME_STORAGE_KEY = 'weiran_theme';
export const THEME_MODES: readonly ThemeMode[] = ['light', 'dark', 'system'];
export const DEFAULT_THEME: ThemePrefs = { mode: 'light', color: DEFAULT_THEME_COLOR };

const SYSTEM_DARK_QUERY = '(prefers-color-scheme: dark)';

function isThemeMode(v: unknown): v is ThemeMode {
    return typeof v === 'string' && (THEME_MODES as readonly string[]).includes(v);
}

/** 读偏好；存储不可用、JSON 损坏或字段非法时逐字段回落默认值 */
export function loadThemePrefs(): ThemePrefs {
    try {
        const raw = localStorage.getItem(THEME_STORAGE_KEY);
        if (!raw) return { ...DEFAULT_THEME };
        const parsed: unknown = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null) return { ...DEFAULT_THEME };
        const { mode, color } = parsed as Partial<Record<keyof ThemePrefs, unknown>>;
        return {
            mode: isThemeMode(mode) ? mode : DEFAULT_THEME.mode,
            color: isValidThemeColor(color) ? color : DEFAULT_THEME.color,
        };
    } catch {
        return { ...DEFAULT_THEME };
    }
}

/** 写偏好；隐私模式 / 配额满时静默失败，不影响当次会话 */
export function saveThemePrefs(prefs: ThemePrefs): void {
    try {
        localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs));
    } catch {
        // 忽略
    }
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

export function applyTheme(prefs: ThemePrefs, prefersDark: boolean): void {
    const isDark = resolveIsDark(prefs.mode, prefersDark);
    applyColorMode(isDark);
    applyThemeColor(prefs.color, isDark);
}

/** 在 React 挂载前同步应用已存主题，避免深色用户首屏先闪一下白底 */
export function bootstrapTheme(): void {
    applyTheme(loadThemePrefs(), systemPrefersDark());
}
