import { render } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Rocket, Settings, Star } from 'lucide-react';
import { MENU_ICONS, mergeIcons, renderNavIcon } from '../icons';

describe('renderNavIcon', () => {
    it('Semi SubNav 注入 size="large" 时图标仍保持 16px', () => {
        // 复现 Semi SubNav.renderIcon 的行为：cloneElement(icon, { size: 'large' })
        const icon = renderNavIcon('Settings') as ReactElement;
        const { container } = render(cloneElement(icon, { size: 'large' } as never));
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('16');
        expect(svg?.getAttribute('height')).toBe('16');
    });

    it('Semi Breadcrumb.Item 注入 size="default" 与 className 时保持指定尺寸并保留 className', () => {
        // 复现 Semi Breadcrumb Item.renderIcon：cloneElement(icon, { className, size: 'default' })
        const icon = renderNavIcon('House', 14) as ReactElement;
        const { container } = render(cloneElement(icon, { size: 'default', className: 'semi-breadcrumb-item-icon' } as never));
        const svg = container.querySelector('svg');
        expect(svg?.getAttribute('width')).toBe('14');
        expect(svg).toHaveClass('semi-breadcrumb-item-icon');
    });

    it('未知或空图标名返回 null', () => {
        expect(renderNavIcon('NoSuchIcon')).toBeNull();
        expect(renderNavIcon(null)).toBeNull();
    });
});

describe('mergeIcons', () => {
    const base = { Settings, Star };

    it('追加下游图标，基座图标全部保留', () => {
        const merged = mergeIcons(base, { '../biz/icons.ts': { icons: { Rocket } } });
        expect(merged.Rocket).toBe(Rocket);
        expect(Object.keys(merged)).toHaveLength(Object.keys(base).length + 1);
    });

    it('没有下游文件时与基座白名单相同', () => {
        expect(mergeIcons(base, {})).toEqual(base);
    });

    it('与基座重名时以基座为准，并报告重名', () => {
        const duplicates: string[] = [];
        const merged = mergeIcons(base, { '../biz/icons.ts': { icons: { Settings: Rocket } } }, (name, file) =>
            duplicates.push(`${file}:${name}`),
        );
        expect(merged.Settings).toBe(Settings);
        expect(duplicates).toEqual(['../biz/icons.ts:Settings']);
    });

    it('上游仓库没有 src/biz 时，菜单图标表就是基座白名单', () => {
        expect(MENU_ICONS.Settings).toBe(Settings);
        expect(MENU_ICONS.Rocket).toBeUndefined();
    });
});
