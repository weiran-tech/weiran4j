import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { FileUpload } from '../FileUpload';

afterEach(() => vi.unstubAllGlobals());

it('文件发送时显示真实进度，完成后更新地址并清除进度', async () => {
    mockFetch({
        'GET /api-backend/system/media/getDirectUploadAuthorization': null,
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
    });
    const requests: MockUploadRequest[] = [];
    class MockUploadRequest {
        upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onabort: (() => void) | null = null;
        status = 200;
        responseText = JSON.stringify({ code: 0, message: 'ok', data: { url: '/system-uploads/cover.png' } });
        withCredentials = false;
        open() { /* 测试只需模拟响应 */ }
        setRequestHeader() { /* 测试只需模拟响应 */ }
        getResponseHeader() { return null; }
        send() { requests.push(this); }
        abort() { this.onabort?.(); }
        emitProgress(percent: number) {
            this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 } as ProgressEvent);
        }
        finish() { this.emitProgress(100); this.onload?.(); }
    }
    vi.stubGlobal('XMLHttpRequest', MockUploadRequest);
    const onChange = vi.fn();
    const onUploadingChange = vi.fn();
    const { container } = renderWithProviders(<FileUpload value="" onChange={onChange} onUploadingChange={onUploadingChange} />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).not.toBeNull();
        expect(element).toBeEnabled();
        return element;
    });

    fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
    await waitFor(() => expect(requests).toHaveLength(1));
    act(() => requests[0]!.emitProgress(50));
    expect(screen.getByRole('status')).toHaveTextContent('50%');
    expect(screen.getByRole('status')).not.toHaveTextContent('cover.png');
    expect(screen.getByRole('status').closest('.file-upload__dropzone')).not.toBeNull();
    expect(onUploadingChange).toHaveBeenCalledWith(true);

    act(() => requests[0]!.finish());
    await waitFor(() => expect(onChange).toHaveBeenCalledWith('/system-uploads/cover.png'));
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
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
