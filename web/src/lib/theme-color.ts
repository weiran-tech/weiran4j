/**
 * 主题色：预设色板 + 任意 hex 推导 + 写入 CSS 变量。
 *
 * 移植自 mono4ts `lib/theme-color.ts`。主题色取值为预设 key（如 `blue`）或 `#rrggbb` 自定义色；
 * 浅色 / 深色模式各有一组变量，深色下主色提亮，避免在深底上发闷。
 */

export interface ColorVars {
    primary: string;
    hover: string;
    active: string;
    lightDefault: string;
    lightHover: string;
    lightActive: string;
    sidebarActive: string;
}

export interface ThemeColorPreset {
    key: string;
    name: string;
    light: ColorVars;
    dark: ColorVars;
}

/** 本项目默认主色（见 CLAUDE.md「设计」） */
export const DEFAULT_PRIMARY = '#0064FA';
export const DEFAULT_THEME_COLOR = 'default';

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
    const clean = hex.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(clean)) return null;
    return {
        r: Number.parseInt(clean.slice(0, 2), 16),
        g: Number.parseInt(clean.slice(2, 4), 16),
        b: Number.parseInt(clean.slice(4, 6), 16),
    };
}

function hueToRgb(p: number, q: number, t: number): number {
    let tt = t;
    if (tt < 0) tt += 1;
    if (tt > 1) tt -= 1;
    if (tt < 1 / 6) return p + (q - p) * 6 * tt;
    if (tt < 1 / 2) return q;
    if (tt < 2 / 3) return p + (q - p) * (2 / 3 - tt) * 6;
    return p;
}

function hslToHex(h: number, s: number, l: number): string {
    const hh = h / 360;
    const ss = s / 100;
    const ll = l / 100;
    let r: number;
    let g: number;
    let b: number;
    if (ss === 0) {
        r = g = b = ll;
    } else {
        const q = ll < 0.5 ? ll * (1 + ss) : ll + ss - ll * ss;
        const p = 2 * ll - q;
        r = hueToRgb(p, q, hh + 1 / 3);
        g = hueToRgb(p, q, hh);
        b = hueToRgb(p, q, hh - 1 / 3);
    }
    const toHex = (x: number) =>
        Math.round(x * 255)
            .toString(16)
            .padStart(2, '0');
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
    const rr = r / 255;
    const gg = g / 255;
    const bb = b / 255;
    const max = Math.max(rr, gg, bb);
    const min = Math.min(rr, gg, bb);
    let h = 0;
    let s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        if (max === rr) h = ((gg - bb) / d + (gg < bb ? 6 : 0)) / 6;
        else if (max === gg) h = ((bb - rr) / d + 2) / 6;
        else h = ((rr - gg) / d + 4) / 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
}

function rgba(hex: string, alpha: number): string {
    const rgb = hexToRgb(hex);
    return rgb ? `rgba(${rgb.r},${rgb.g},${rgb.b},${alpha.toFixed(2)})` : `rgba(0,0,0,${alpha.toFixed(2)})`;
}

/**
 * 从任意 hex 推导整组变量。
 * 浅色：主色原样，hover / active 逐级压暗；深色：主色与 hover 提亮，active 用原色。
 * 非法 hex 时三档主色都原样返回，浅色底用中性灰，不抛错。
 */
export function deriveColorVars(hex: string, isDark: boolean): ColorVars {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return {
            primary: hex,
            hover: hex,
            active: hex,
            lightDefault: 'rgba(0,0,0,0.10)',
            lightHover: 'rgba(0,0,0,0.15)',
            lightActive: 'rgba(0,0,0,0.20)',
            sidebarActive: 'rgba(0,0,0,0.10)',
        };
    }
    const { r, g, b } = rgb;
    const { h, s, l } = rgbToHsl(r, g, b);
    if (isDark) {
        return {
            primary: hslToHex(h, s, Math.min(l + 15, 88)),
            hover: hslToHex(h, s, Math.min(l + 8, 82)),
            active: hex,
            lightDefault: `rgba(${r},${g},${b},0.15)`,
            lightHover: `rgba(${r},${g},${b},0.20)`,
            lightActive: `rgba(${r},${g},${b},0.25)`,
            sidebarActive: `rgba(${r},${g},${b},0.25)`,
        };
    }
    return {
        primary: hex,
        hover: hslToHex(h, s, Math.max(l - 9, 8)),
        active: hslToHex(h, s, Math.max(l - 18, 5)),
        lightDefault: `rgba(${r},${g},${b},0.10)`,
        lightHover: `rgba(${r},${g},${b},0.15)`,
        lightActive: `rgba(${r},${g},${b},0.20)`,
        sidebarActive: `rgba(${r},${g},${b},0.10)`,
    };
}

/**
 * 预设：[key, 名称, 浅色 primary/hover/active, 深色 primary/hover/active]。
 * 浅底色（light-*）由各自的 primary 按固定透明度生成：浅色 0.10/0.15/0.20，深色 0.15/0.20/0.25。
 */
type PresetRow = [string, string, string, string, string, string, string, string];

const PRESET_ROWS: PresetRow[] = [
    ['wechat', '微信绿', '#07c160', '#06a854', '#058f45', '#4ecb71', '#1db95f', '#07c160'],
    ['blue', '飞书蓝', '#3370ff', '#2860e1', '#1d4ed8', '#618bff', '#4d78ff', '#3370ff'],
    ['indigo', '靛紫', '#4f46e5', '#4338ca', '#3730a3', '#818cf8', '#6d66f5', '#4f46e5'],
    ['violet', '薰衣草紫', '#7c3aed', '#6d28d9', '#5b21b6', '#a78bfa', '#9b6df5', '#7c3aed'],
    ['cyan', '湖蓝', '#0891b2', '#0e7490', '#155e75', '#22d3ee', '#06b6d4', '#0891b2'],
    ['green', '碧绿', '#059669', '#047857', '#065f46', '#34d399', '#10b981', '#059669'],
    ['orange', '橙珀', '#d97706', '#b45309', '#92400e', '#fbbf24', '#f59e0b', '#d97706'],
    ['rose', '玫瑰红', '#e11d48', '#be123c', '#9f1239', '#fb7185', '#f43f5e', '#e11d48'],
    ['fuchsia', '品红', '#c026d3', '#a21caf', '#86198f', '#e879f9', '#d946ef', '#c026d3'],
    ['teal', '青碧', '#0d9488', '#0f766e', '#115e59', '#2dd4bf', '#14b8a6', '#0d9488'],
    ['slate', '钢灰', '#475569', '#334155', '#1e293b', '#94a3b8', '#7c8fa3', '#64748b'],
    ['red', '朱砂红', '#dc2626', '#b91c1c', '#991b1b', '#f87171', '#ef4444', '#dc2626'],
    ['pink', '少女粉', '#db2777', '#be185d', '#9d174d', '#f472b6', '#ec4899', '#db2777'],
    ['amber', '琥珀金', '#f59e0b', '#d97706', '#b45309', '#fcd34d', '#fbbf24', '#f59e0b'],
    ['sky', '天空蓝', '#0284c7', '#0369a1', '#075985', '#38bdf8', '#0ea5e9', '#0284c7'],
    ['coral', '珊瑚橙', '#f97316', '#ea6c0d', '#c2540a', '#fb923c', '#f97316', '#ea6c0d'],
    ['lime', '金橄榄', '#65a30d', '#4d7c0f', '#3f6212', '#a3e635', '#84cc16', '#65a30d'],
    ['brown', '深棕', '#92400e', '#78350f', '#5c280a', '#d97706', '#b45309', '#92400e'],
    ['charcoal', '墨黑', '#27272a', '#18181b', '#09090b', '#a1a1aa', '#71717a', '#52525b'],
];

function presetVars(primary: string, hover: string, active: string, isDark: boolean): ColorVars {
    const [a1, a2, a3, side] = isDark ? [0.15, 0.2, 0.25, 0.25] : [0.1, 0.15, 0.2, 0.1];
    return {
        primary,
        hover,
        active,
        lightDefault: rgba(primary, a1),
        lightHover: rgba(primary, a2),
        lightActive: rgba(primary, a3),
        sidebarActive: rgba(primary, side),
    };
}

/** 默认主色排第一，其后是 mono4ts 的 19 个预设 */
export const THEME_COLOR_PRESETS: readonly ThemeColorPreset[] = [
    {
        key: DEFAULT_THEME_COLOR,
        name: '默认蓝',
        light: deriveColorVars(DEFAULT_PRIMARY, false),
        dark: deriveColorVars(DEFAULT_PRIMARY, true),
    },
    ...PRESET_ROWS.map(([key, name, lp, lh, la, dp, dh, da]) => ({
        key,
        name,
        light: presetVars(lp, lh, la, false),
        dark: presetVars(dp, dh, da, true),
    })),
];

/** 是否为合法的主题色取值：预设 key 或 #rrggbb */
export function isValidThemeColor(color: unknown): color is string {
    return typeof color === 'string' && (THEME_COLOR_PRESETS.some((p) => p.key === color) || hexToRgb(color) !== null);
}

export function getThemeColorVars(color: string, isDark: boolean): ColorVars {
    const preset = THEME_COLOR_PRESETS.find((p) => p.key === color);
    if (preset) return isDark ? preset.dark : preset.light;
    return deriveColorVars(color, isDark);
}

/**
 * 把主题色写进文档 CSS 变量。
 *
 * html 与 body 都写：Semi 把自己的变量挂在 `body` / `body[theme-mode='dark']` 上，
 * 只写 html 会被 body 上的默认值盖住，切到深色时主色就回到 Semi 默认蓝。
 */
export function applyThemeColor(color: string, isDark: boolean): void {
    const vars = getThemeColorVars(color, isDark);
    const entries: [string, string][] = [
        ['--color-primary', vars.primary],
        ['--color-sidebar-active', vars.sidebarActive],
        ['--color-sidebar-text-active', isDark ? '#ffffff' : vars.primary],
        ['--semi-color-primary', vars.primary],
        ['--semi-color-primary-hover', vars.hover],
        ['--semi-color-primary-active', vars.active],
        ['--semi-color-primary-light-default', vars.lightDefault],
        ['--semi-color-primary-light-hover', vars.lightHover],
        ['--semi-color-primary-light-active', vars.lightActive],
    ];
    for (const [name, value] of entries) {
        document.documentElement.style.setProperty(name, value);
        document.body.style.setProperty(name, value);
    }
}
