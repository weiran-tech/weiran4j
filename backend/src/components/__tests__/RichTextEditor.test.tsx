import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { RichTextEditor } from '../RichTextEditor';

describe('RichTextEditor', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('上传视频后插入可播放的 video HTML', async () => {
        const { calls } = mockFetch({
            'GET /api-backend/system/media/getUploadSettings': {
                imageFormats: ['png'], imageMaxSizeMb: 2, videoMaxSizeMb: 5, fileFormats: ['pdf'],
            },
            'POST /api-backend/system/media/uploadFile': {
                url: '/system-uploads/clip.mp4', name: 'clip.mp4', path: 'clip.mp4', size: 1,
            },
        });
        const onChange = vi.fn();
        const { container } = renderWithProviders(<RichTextEditor value="<p>正文</p>" onChange={onChange} />);
        fireEvent.click(await screen.findByRole('button', { name: '上传并插入视频' }));
        const input = container.querySelector('input[type="file"][accept=".mp4,.webm,.mov"]');
        expect(input).not.toBeNull();
        fireEvent.change(input!, { target: { files: [new File(['video'], 'clip.mp4', { type: 'video/mp4' })] } });
        await waitFor(() => expect(onChange).toHaveBeenCalledWith(expect.stringContaining('<video')));
        expect(onChange.mock.lastCall?.[0]).toContain('src="/system-uploads/clip.mp4"');
        expect(onChange.mock.lastCall?.[0]).toContain('controls');
        expect(calls.some((call) => call.method === 'POST' && call.path === '/api-backend/system/media/uploadFile')).toBe(true);
    });
});
