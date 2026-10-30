import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { RichTextEditor } from '../RichTextEditor';

describe('RichTextEditor', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('上传视频后插入可播放的 video HTML', async () => {
        const { calls, fn } = mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoMaxSizeMb: 5, fileFormats: ['pdf'],
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        let finishUpload!: () => void;
        const uploadPending = new Promise<void>((resolve) => { finishUpload = resolve; });
        vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL, init?: RequestInit) => {
            const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
            if (init?.method === 'POST' && url.includes('/api-backend/system/media/uploadFile')) {
                return uploadPending.then(() => fn(input, init));
            }
            return fn(input, init);
        }));
        const onChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={onChange} />);
        fireEvent.click(await screen.findByRole('button', { name: '上传并插入视频' }));
        const input = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(input).not.toBeNull();
        fireEvent.change(input!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        expect(await screen.findByRole('status')).toHaveTextContent('视频上传中（1 个）');
        expect(onChange).not.toHaveBeenCalledWith(expect.stringContaining('视频上传中'));
        act(() => finishUpload());
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringContaining('<video')));
        expect(screen.queryByRole('status')).toBeNull();
        expect(onChange.mock.lastCall?.[0]).toContain('src="/system-uploads/clip.mp4"');
        expect(onChange.mock.lastCall?.[0]).toContain('controls');
        expect(calls.some((call) => call.method === 'POST' && call.path === '/api-backend/system/media/uploadFile')).toBe(true);
    });

    it('图片和视频分别禁用自己的按钮，表单等待全部上传完成', async () => {
        mockFetch({
            'GET /api-backend/system/media/getDirectUploadAuthorization': null,
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoMaxSizeMb: 5, fileFormats: ['pdf'],
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
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
                imageFormats: ['png'], imageMaxSizeMb: 2, videoMaxSizeMb: 5, fileFormats: ['pdf'],
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
