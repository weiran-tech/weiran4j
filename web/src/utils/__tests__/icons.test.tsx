import { render } from '@testing-library/react';
import { cloneElement, type ReactElement } from 'react';
import { describe, expect, it } from 'vitest';
import { renderNavIcon } from '../icons';

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
