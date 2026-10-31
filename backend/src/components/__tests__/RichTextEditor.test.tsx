import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { RichTextEditor } from '../RichTextEditor';

function stubUploadRequest(automatic = false) {
    const requests: Array<{
        upload: { onprogress: ((event: ProgressEvent) => void) | null };
        onload: (() => void) | null;
        emitProgress: (percent: number) => void;
        finish: () => void;
    }> = [];
    class MockUploadRequest {
        upload = { onprogress: null as ((event: ProgressEvent) => void) | null };
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
        onabort: (() => void) | null = null;
        status = 200;
        responseText = JSON.stringify({ code: 0, message: 'ok', data: { url: '/system-uploads/clip.mp4' } });
        withCredentials = false;
        open() { /* 测试只需模拟上传响应 */ }
        setRequestHeader() { /* 测试只需模拟上传响应 */ }
        getResponseHeader() { return null; }
        send() {
            requests.push(this);
            if (automatic) queueMicrotask(() => this.finish());
        }
        emitProgress(percent: number) {
            this.upload.onprogress?.({ lengthComputable: true, loaded: percent, total: 100 } as ProgressEvent);
        }
        finish() {
            this.emitProgress(100);
            this.onload?.();
        }
        abort() { this.onabort?.(); }
    }
    vi.stubGlobal('XMLHttpRequest', MockUploadRequest);
    return requests;
}

describe('RichTextEditor', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('上传视频后插入可播放的 video HTML', async () => {
        mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        const requests = stubUploadRequest();
        const onChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={onChange} />);
        const videoButton = await screen.findByRole('button', { name: '上传并插入视频' });
        await waitFor(() => expect(videoButton).toBeEnabled());
        fireEvent.click(videoButton);
        const input = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(input).not.toBeNull();
        fireEvent.change(input!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        expect(await screen.findByRole('status')).toHaveTextContent('视频上传中（1 个）');
        expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('视频上传中'));
        await waitFor(() => expect(requests).toHaveLength(1));
        act(() => requests[0]!.emitProgress(50));
        expect(screen.getByRole('status')).toHaveTextContent('50%');
        act(() => requests[0]!.finish());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringContaining('<video')));
        expect(screen.queryByRole('status')).toBeNull();
        expect(onChange.mock.lastCall?.[0]).toContain('src="/system-uploads/clip.mp4"');
        expect(onChange.mock.lastCall?.[0]).toContain('controls');
        expect(requests).toHaveLength(1);
    });

    it('图片和视频分别禁用自己的按钮，表单等待全部上传完成', async () => {
        mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        stubUploadRequest(true);
        let resolveImage!: (url: string) => void;
        const onUploadImage = vi.fn(() => new Promise<string>((resolve) => { resolveImage = resolve; }));
        const onUploadingChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={() => undefined} onUploadImage={onUploadImage} onUploadingChange={onUploadingChange} />);
        const imageButton = await screen.findByRole('button', { name: '上传并插入图片' });
        const videoButton = screen.getByRole('button', { name: '上传并插入视频' });
        const imageInput = await waitFor(() => {
            const input = container.querySelector('input[type="file"][accept=".png"]');
            expect(input).not.toBeNull();
            return input;
        });
        const videoInput = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(imageInput).not.toBeNull();
        expect(videoInput).not.toBeNull();

        fireEvent.change(imageInput!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
        await waitFor(() => expect(imageButton).toBeDisabled());
        expect(screen.getByRole('status')).toHaveTextContent('图片上传中（1 张）');
        expect(videoButton).toBeEnabled();
        expect(onUploadingChange).toHaveBeenCalledWith(true);

        fireEvent.change(videoInput!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        await waitFor(() => expect(videoButton).toBeEnabled());
        expect(imageButton).toBeDisabled();
        expect(onUploadingChange).toHaveBeenCalledTimes(1);

        act(() => { resolveImage('/system-uploads/cover.png'); });
        await waitFor(() => expect(imageButton).toBeEnabled());
        expect(screen.queryByRole('status')).toBeNull();
        expect(onUploadingChange).toHaveBeenLastCalledWith(false);
    });

    it('图片上传失败后清除占位提示', async () => {
        mockFetch({
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4', 'webm', 'mov'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
            },
        });
        let rejectImage!: (error: Error) => void;
        const onUploadImage = vi.fn(() => new Promise<string>((_resolve, reject) => { rejectImage = reject; }));
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={() => undefined} onUploadImage={onUploadImage} />);
        const input = await waitFor(() => {
            const element = container.querySelector('input[type="file"][accept=".png"]');
            expect(element).not.toBeNull();
            return element;
        });
        fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png', { type: 'image/png' })] } });
        expect(await screen.findByRole('status')).toHaveTextContent('图片上传中（1 张）');
        act(() => rejectImage(new Error('上传失败')));
        await waitFor(() => expect(screen.queryByRole('status')).toBeNull());
        expect(container.querySelector('.ProseMirror img')).toBeNull();
    });
});
