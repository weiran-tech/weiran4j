import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ReactNode } from 'react';
import { PreferencesProvider } from '@/hooks/PreferencesProvider';
import { defaultPreferences, type UserPreferences } from '@/hooks/usePreferences';
import { PREFERENCES_STORAGE_KEY } from '@/lib/preferences-storage';
import { ThemeProvider } from '../ThemeProvider';
import { useThemeController } from '../theme-context';

/** 可控的 prefers-color-scheme：setDark() 模拟系统切换并派发 change */
function mockSystemScheme(initialDark: boolean) {
    let dark = initialDark;
    const listeners = new Set<(e: { matches: boolean }) => void>();
    vi.stubGlobal('matchMedia', (query: string) => {
        const isScheme = query === '(prefers-color-scheme: dark)';
        return {
            get matches() {
                return isScheme ? dark : false;
            },
            media: query,
            addEventListener: (_: string, fn: (e: { matches: boolean }) => void) => {
                if (isScheme) listeners.add(fn);
            },
            removeEventListener: (_: string, fn: (e: { matches: boolean }) => void) => listeners.delete(fn),
        };
    });
    return {
        setDark(next: boolean) {
            dark = next;
            act(() => listeners.forEach((fn) => fn({ matches: next })));
        },
    };
}

function Probe() {
    const { mode, color, isDark, cycleMode, setColor } = useThemeController();
    return (
        <div>
            <span data-testid="state">{`${mode}|${color}|${isDark ? 'dark' : 'light'}`}</span>
            <button onClick={cycleMode}>cycle</button>
            <button onClick={() => setColor('#abcdef')}>custom</button>
        </div>
    );
}

/** 主题状态在偏好里，ThemeProvider 必须在 PreferencesProvider 内 */
function Providers({ children }: { children: ReactNode }) {
    return (
        <PreferencesProvider>
            <ThemeProvider>{children}</ThemeProvider>
        </PreferencesProvider>
    );
}

const storedPrefs = () => JSON.parse(localStorage.getItem(PREFERENCES_STORAGE_KEY) ?? 'null') as UserPreferences | null;
const savePrefs = (patch: Partial<UserPreferences>) =>
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, ...patch }));

const state = () => screen.getByTestId('state').textContent;
const isBodyDark = () => document.body.getAttribute('theme-mode') === 'dark';

describe('ThemeProvider', () => {
    beforeEach(() => {
        document.body.removeAttribute('theme-mode');
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        document.body.removeAttribute('style');
        document.documentElement.removeAttribute('style');
    });

    it('默认 light，应用 #0064FA', () => {
        mockSystemScheme(true);
        render(
            <Providers>
                <Probe />
            </Providers>,
        );
        expect(state()).toBe('light|#0064FA|light');
        expect(isBodyDark()).toBe(false);
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#0064FA');
    });

    it('light → dark → system 循环，并持久化', () => {
        const system = mockSystemScheme(false);
        render(
            <Providers>
                <Probe />
            </Providers>,
        );
        act(() => screen.getByText('cycle').click());
        expect(state()).toBe('dark|#0064FA|dark');
        expect(isBodyDark()).toBe(true);

        act(() => screen.getByText('cycle').click());
        expect(state()).toBe('system|#0064FA|light');
        expect(isBodyDark()).toBe(false);
        expect(storedPrefs()).toMatchObject({ colorMode: 'system', themeColor: '#0064FA' });

        // system 模式跟随系统切换
        system.setDark(true);
        expect(state()).toBe('system|#0064FA|dark');
        expect(isBodyDark()).toBe(true);
        system.setDark(false);
        expect(isBodyDark()).toBe(false);

        act(() => screen.getByText('cycle').click());
        expect(state()).toBe('light|#0064FA|light');
    });

    it('非 system 模式不受系统切换影响', () => {
        const system = mockSystemScheme(false);
        savePrefs({ colorMode: 'light' });
        render(
            <Providers>
                <Probe />
            </Providers>,
        );
        system.setDark(true);
        expect(isBodyDark()).toBe(false);
    });

    it('从存储恢复偏好；自定义主色写入 CSS 变量并持久化', () => {
        mockSystemScheme(false);
        savePrefs({ colorMode: 'dark', themeColor: 'green' });
        render(
            <Providers>
                <Probe />
            </Providers>,
        );
        expect(state()).toBe('dark|green|dark');
        expect(document.body.style.getPropertyValue('--semi-color-primary')).toBe('#34d399');

        act(() => screen.getByText('custom').click());
        expect(state()).toBe('dark|#abcdef|dark');
        expect(storedPrefs()).toMatchObject({ colorMode: 'dark', themeColor: '#abcdef' });
        expect(document.body.style.getPropertyValue('--semi-color-primary-active')).toBe('#abcdef');
    });

    it('在 Provider 外使用直接报错', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        expect(() => render(<Probe />)).toThrow(/ThemeProvider/);
        expect(() => render(<ThemeProvider><Probe /></ThemeProvider>)).toThrow(/PreferencesProvider/);
    });
});
