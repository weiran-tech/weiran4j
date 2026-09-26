import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePrefersDark } from '@/hooks/useMediaQuery';
import { applyTheme, loadThemePrefs, resolveIsDark, saveThemePrefs, THEME_MODES, type ThemeMode, type ThemePrefs } from '@/lib/theme';
import { ThemeContext, type ThemeControllerValue } from './theme-context';

/**
 * 主题（主色 + 明暗模式）的状态源。偏好存 localStorage `weiran_theme`；
 * system 模式下订阅 prefers-color-scheme，系统切换时自动跟随。
 * 首屏的应用由 main.tsx 的 bootstrapTheme() 在挂载前完成，这里负责之后的变更。
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
    const [prefs, setPrefs] = useState<ThemePrefs>(loadThemePrefs);
    const prefersDark = usePrefersDark();
    const isDark = resolveIsDark(prefs.mode, prefersDark);

    useEffect(() => {
        applyTheme(prefs, prefersDark);
    }, [prefs, prefersDark]);

    const update = useCallback((patch: Partial<ThemePrefs>) => {
        setPrefs((prev) => {
            const next = { ...prev, ...patch };
            saveThemePrefs(next);
            return next;
        });
    }, []);

    const setMode = useCallback((mode: ThemeMode) => update({ mode }), [update]);
    const setColor = useCallback((color: string) => update({ color }), [update]);
    const cycleMode = useCallback(() => {
        const next = THEME_MODES[(THEME_MODES.indexOf(prefs.mode) + 1) % THEME_MODES.length] ?? 'light';
        update({ mode: next });
    }, [prefs.mode, update]);

    const value = useMemo<ThemeControllerValue>(
        () => ({ mode: prefs.mode, color: prefs.color, isDark, setMode, setColor, cycleMode }),
        [prefs.mode, prefs.color, isDark, setMode, setColor, cycleMode],
    );

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
