import { Dropdown, Popover } from '@douyinfe/semi-ui';
import { Check, Monitor, Moon, Palette, Pipette, Sun } from 'lucide-react';
import type { ReactNode } from 'react';
import type { ThemeMode } from '@/lib/theme';
import { DEFAULT_PRIMARY, DEFAULT_THEME_COLOR, THEME_COLOR_PRESETS } from '@/lib/theme-color';
import { useThemeController } from '@/providers/theme-context';

const MODE_META: Record<ThemeMode, { label: string; icon: ReactNode }> = {
    light: { label: '浅色', icon: <Sun size={16} strokeWidth={1.8} /> },
    dark: { label: '深色', icon: <Moon size={16} strokeWidth={1.8} /> },
    system: { label: '跟随系统', icon: <Monitor size={16} strokeWidth={1.8} /> },
};

/** 明暗模式按钮：点击按 浅色 → 深色 → 跟随系统 循环，悬停展开下拉直接选 */
export function ThemeModeButton() {
    const { mode, setMode, cycleMode } = useThemeController();
    return (
        <Dropdown
            position="bottomRight"
            render={
                <Dropdown.Menu>
                    <Dropdown.Title>颜色模式</Dropdown.Title>
                    {(Object.keys(MODE_META) as ThemeMode[]).map((m) => (
                        <Dropdown.Item key={m} icon={MODE_META[m].icon} active={mode === m} onClick={() => setMode(m)}>
                            {MODE_META[m].label}
                        </Dropdown.Item>
                    ))}
                </Dropdown.Menu>
            }
        >
            <button type="button" className="admin-theme-btn" aria-label={`切换主题（当前：${MODE_META[mode].label}）`} onClick={cycleMode}>
                {MODE_META[mode].icon}
            </button>
        </Dropdown>
    );
}

/** 默认蓝在偏好里存 hex（#0064FA），其余预设存 key */
function presetValue(key: string): string {
    return key === DEFAULT_THEME_COLOR ? DEFAULT_PRIMARY : key;
}

function isSameColor(a: string, b: string): boolean {
    return a.toLowerCase() === b.toLowerCase();
}

/**
 * 主题色面板：预设色板 + 自定义取色（任意 hex，经 deriveColorVars 推导整组变量）。
 * `embedded` 用于偏好设置抽屉：不带标题与弹层内边距。
 */
export function ThemeColorPanel({ embedded = false }: { embedded?: boolean }) {
    const { color, isDark, setColor } = useThemeController();
    const isCustom = color.startsWith('#') && !isSameColor(color, DEFAULT_PRIMARY);
    return (
        <div className={embedded ? undefined : 'theme-color-panel'}>
            {!embedded && <div className="theme-color-panel__title">主题色</div>}
            <div className="theme-color-picker">
                {THEME_COLOR_PRESETS.map((preset) => {
                    const swatch = (isDark ? preset.dark : preset.light).primary;
                    const active = isSameColor(color, presetValue(preset.key));
                    return (
                        <button
                            key={preset.key}
                            type="button"
                            className={`theme-color-swatch${active ? ' theme-color-swatch--active' : ''}`}
                            style={{ backgroundColor: swatch, color: swatch }}
                            title={preset.name}
                            aria-label={preset.name}
                            aria-pressed={active}
                            onClick={() => setColor(presetValue(preset.key))}
                        >
                            {active && (
                                <span className="theme-color-swatch__check">
                                    <Check size={14} strokeWidth={2.5} />
                                </span>
                            )}
                        </button>
                    );
                })}
                <label
                    className={`theme-color-swatch theme-color-swatch--custom${isCustom ? ' theme-color-swatch--active' : ''}`}
                    title="自定义颜色"
                >
                    <span className="theme-color-swatch__check">
                        {isCustom ? <Check size={14} strokeWidth={2.5} /> : <Pipette size={13} strokeWidth={2} />}
                    </span>
                    <input
                        type="color"
                        className="theme-color-swatch__input"
                        aria-label="自定义颜色"
                        value={isCustom ? color : '#0064fa'}
                        onChange={(e) => setColor(e.target.value)}
                    />
                </label>
            </div>
        </div>
    );
}

export function ThemeColorButton() {
    return (
        <Popover trigger="click" position="bottomRight" showArrow content={<ThemeColorPanel />}>
            <button type="button" className="admin-theme-btn" aria-label="主题色">
                <Palette size={16} strokeWidth={1.8} />
            </button>
        </Popover>
    );
}
