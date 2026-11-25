import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { FileUpload } from '../FileUpload';

afterEach(() => vi.unstubAllGlobals());

it('Mock 上传完成后更新地址并结束上传状态', async () => {
    mockFetch({
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
        'POST /api-backend/system/media/uploadFile': { url: 'data:image/png;base64,abc' },
    });
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const { container } = renderWithProviders(<FileUpload value="" onChange={onChange} onUploadingChange={onUploadingChange} />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).toBeEnabled();
        return element;
    });
    fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('data:image/png;base64,abc'));
    expect(onUploadingChange).toHaveBeenCalledWith(true);
    expect(onUploadingChange).toHaveBeenLastCalledWith(false);
});

it('业务注入上传动作可选回报进度', async () => {
    mockFetch({
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
    });
    let report!: (percent: number) => void;
    let finish!: (url: string) => void;
    const onUpload = vi.fn((_file: File, onProgress?: (percent: number) => void) => new Promise<string>((resolve) => {
        report = onProgress!;
        finish = resolve;
    }));
    const onChange = vi.fn();
    const { container } = renderWithProviders(<FileUpload value="" onChange={onChange} onUpload={onUpload} />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).not.toBeNull();
        expect(element).toBeEnabled();
        return element;
    });
    fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    await waitFor(() => expect(onUpload).toHaveBeenCalledTimes(1));
    expect(screen.getByRole('status')).toHaveTextContent('上传中…');
    act(() => report(40));
    expect(screen.getByRole('status')).toHaveTextContent('40%');
    act(() => finish('/system-uploads/cover.png'));
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/system-uploads/cover.png'));
});
