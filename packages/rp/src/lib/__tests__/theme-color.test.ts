import { afterEach, describe, expect, it } from 'vitest';
import { applyThemeColor, deriveColorVars, getThemeColorVars, isValidThemeColor, THEME_COLOR_PRESETS } from '../theme-color';

function cssVar(el: HTMLElement, name: string) {
    return el.style.getPropertyValue(name);
}

describe('theme-color', () => {
    afterEach(() => {
        document.documentElement.removeAttribute('style');
        document.body.removeAttribute('style');
    });

    it('默认主色排第一且为 #0064FA，其后是 19 个预设', () => {
        expect(THEME_COLOR_PRESETS).toHaveLength(20);
        expect(THEME_COLOR_PRESETS[0]?.key).toBe('default');
        expect(THEME_COLOR_PRESETS[0]?.light.primary).toBe('#0064FA');
        expect(new Set(THEME_COLOR_PRESETS.map((p) => p.key)).size).toBe(20);
    });

    it('预设的浅底色由各自 primary 按固定透明度生成', () => {
        const blue = getThemeColorVars('blue', false);
        expect(blue.primary).toBe('#3370ff');
        expect(blue.lightDefault).toBe('rgba(51,112,255,0.10)');
        const blueDark = getThemeColorVars('blue', true);
        expect(blueDark.primary).toBe('#618bff');
        expect(blueDark.sidebarActive).toBe('rgba(97,139,255,0.25)');
    });

    it('deriveColorVars：浅色下主色原样，hover / active 逐级压暗', () => {
        expect(deriveColorVars('#0064FA', false)).toEqual({
            primary: '#0064FA',
            hover: '#0052cc',
            active: '#003f9e',
            lightDefault: 'rgba(0,100,250,0.10)',
            lightHover: 'rgba(0,100,250,0.15)',
            lightActive: 'rgba(0,100,250,0.20)',
            sidebarActive: 'rgba(0,100,250,0.10)',
        });
    });

    it('deriveColorVars：深色下主色提亮，active 用原色', () => {
        const v = deriveColorVars('#0064FA', true);
        expect(v.primary).toBe('#4791ff');
        expect(v.hover).toBe('#247bff');
        expect(v.active).toBe('#0064FA');
        expect(v.lightDefault).toBe('rgba(0,100,250,0.15)');
    });

    it('deriveColorVars：任意 hex（含小写）都能推导', () => {
        const v = deriveColorVars('#abcdef', false);
        expect(v.hover).toBe('#84b6e8');
        expect(v.active).toBe('#5e9fe0');
        expect(v.lightDefault).toBe('rgba(171,205,239,0.10)');
    });

    it('deriveColorVars：非法 hex 不抛错，主色原样、浅底色回落中性灰', () => {
        const v = deriveColorVars('not-a-color', false);
        expect(v.primary).toBe('not-a-color');
        expect(v.lightDefault).toBe('rgba(0,0,0,0.10)');
    });

    it('getThemeColorVars：非预设 key 走 hex 推导', () => {
        expect(getThemeColorVars('#abcdef', false)).toEqual(deriveColorVars('#abcdef', false));
    });

    it('isValidThemeColor 只接受预设 key 或 #rrggbb', () => {
        expect(isValidThemeColor('default')).toBe(true);
        expect(isValidThemeColor('#12ab9F')).toBe(true);
        expect(isValidThemeColor('#fff')).toBe(false);
        expect(isValidThemeColor('nope')).toBe(false);
        expect(isValidThemeColor(42)).toBe(false);
    });

    it('applyThemeColor 把 Semi 与自定义变量同时写到 html 和 body 上', () => {
        applyThemeColor('default', false);
        for (const el of [document.documentElement, document.body]) {
            expect(cssVar(el, '--semi-color-primary')).toBe('#0064FA');
            expect(cssVar(el, '--semi-color-primary-hover')).toBe('#0052cc');
            expect(cssVar(el, '--semi-color-primary-active')).toBe('#003f9e');
            expect(cssVar(el, '--semi-color-primary-light-default')).toBe('rgba(0,100,250,0.10)');
            expect(cssVar(el, '--semi-color-primary-light-hover')).toBe('rgba(0,100,250,0.15)');
            expect(cssVar(el, '--semi-color-primary-light-active')).toBe('rgba(0,100,250,0.20)');
            expect(cssVar(el, '--color-primary')).toBe('#0064FA');
            expect(cssVar(el, '--color-sidebar-active')).toBe('rgba(0,100,250,0.10)');
            expect(cssVar(el, '--color-sidebar-text-active')).toBe('#0064FA');
        }
    });

    it('applyThemeColor 深色下选中文字为白色、主色取深色变体', () => {
        applyThemeColor('green', true);
        expect(cssVar(document.body, '--semi-color-primary')).toBe('#34d399');
        expect(cssVar(document.body, '--color-sidebar-text-active')).toBe('#ffffff');
    });
});
