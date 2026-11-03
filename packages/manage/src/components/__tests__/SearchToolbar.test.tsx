import { fireEvent, render, screen, within } from '@testing-library/react';
import { vi } from 'vitest';
import { SearchToolbar } from '../SearchToolbar';

describe('SearchToolbar', () => {
    it('没有高级筛选时，搜索与重置是可访问的纯图标按钮', () => {
        const onSearch = vi.fn();
        const onReset = vi.fn();
        render(
            <SearchToolbar onSearch={onSearch} onReset={onReset} tools={<button type="button">列设置</button>}>
                <input aria-label="关键字" />
            </SearchToolbar>,
        );

        const toolbar = document.querySelector('.search-toolbar') as HTMLElement;
        const search = within(toolbar).getByRole('button', { name: '搜索' });
        const reset = within(toolbar).getByRole('button', { name: '重置' });
        expect(search).toHaveTextContent('');
        expect(reset).toHaveTextContent('');
        expect(screen.getByRole('button', { name: '列设置' })).toBeInTheDocument();

        fireEvent.click(search);
        fireEvent.click(reset);
        expect(onSearch).toHaveBeenCalledOnce();
        expect(onReset).toHaveBeenCalledOnce();
    });
});
