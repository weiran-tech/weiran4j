import { IconPicker } from '@weiran-tech/backend-components';
import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';

describe('IconPicker', () => {
    it('搜索、选择和清空图标时回调受控值', async () => {
        const onChange = vi.fn();
        const { rerender } = render(<IconPicker icons={['Folder', 'House']} renderIcon={(name) => <span>{name}</span>} onChange={onChange} />);

        fireEvent.click(screen.getByRole('button', { name: '选择图标' }));
        fireEvent.change(await screen.findByPlaceholderText('搜索图标（共 2 个）'), { target: { value: 'fold' } });
        expect(screen.queryByRole('button', { name: 'House' })).not.toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', { name: 'Folder' }));
        expect(onChange).toHaveBeenLastCalledWith('Folder');

        rerender(<IconPicker value="Folder" icons={['Folder', 'House']} renderIcon={(name) => <span>{name}</span>} onChange={onChange} />);
        fireEvent.click(screen.getByRole('button', { name: '清除图标' }));
        expect(onChange).toHaveBeenLastCalledWith('');
    });
});
