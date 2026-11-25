import { createContext, useContext } from 'react';
import type { ThemeMode } from '@/lib/theme';

export interface ThemeControllerValue {
    mode: ThemeMode;
    /** 预设 key 或 #rrggbb */
    color: string;
    /** 当前实际是否深色（system 模式下取决于系统） */
    isDark: boolean;
    setMode: (mode: ThemeMode) => void;
    setColor: (color: string) => void;
    /** light → dark → system 循环 */
    cycleMode: () => void;
}

export const ThemeContext = createContext<ThemeControllerValue | null>(null);

export function useThemeController(): ThemeControllerValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useThemeController 必须在 ThemeProvider 内使用');
    return ctx;
}
