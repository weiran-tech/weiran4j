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

    it('未知或空图标名返回 null', () => {
        expect(renderNavIcon('NoSuchIcon')).toBeNull();
        expect(renderNavIcon(null)).toBeNull();
    });
});
