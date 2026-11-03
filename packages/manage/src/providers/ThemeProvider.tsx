import { useCallback, useEffect, useMemo, type ReactNode } from 'react';
import { usePrefersDark } from '@/hooks/useMediaQuery';
import { usePreferences } from '@/hooks/usePreferences';
import { applyTheme, resolveIsDark, THEME_MODES, type ThemeMode } from '@/lib/theme';
import { ThemeContext, type ThemeControllerValue } from './theme-context';

/**
 * 主题（主色 + 明暗模式）控制器。状态存在偏好的 colorMode / themeColor 里（必须在 PreferencesProvider 内），
 * 这里只负责应用到文档与提供快捷操作；system 模式下订阅 prefers-color-scheme，系统切换时自动跟随。
 * 首屏的应用由 main.tsx 的 bootstrapTheme() 在挂载前完成。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const { preferences, setPreferences } = usePreferences();
    const { colorMode: mode, themeColor: color } = preferences;
    const prefersDark = usePrefersDark();
    const isDark = resolveIsDark(mode, prefersDark);

    useEffect(() => {
        applyTheme(mode, color, prefersDark);
    }, [mode, color, prefersDark]);

    const setMode = useCallback((next: ThemeMode) => setPreferences({ colorMode: next }), [setPreferences]);
    const setColor = useCallback((next: string) => setPreferences({ themeColor: next }), [setPreferences]);
    const cycleMode = useCallback(() => {
        setMode(THEME_MODES[(THEME_MODES.indexOf(mode) + 1) % THEME_MODES.length] ?? 'light');
    }, [mode, setMode]);

    const value = useMemo<ThemeControllerValue>(
        () => ({ mode, color, isDark, setMode, setColor, cycleMode }),
        [mode, color, isDark, setMode, setColor, cycleMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
