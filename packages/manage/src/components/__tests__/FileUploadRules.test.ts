import { describe, expect, it } from 'vitest';
import { fileUploadError, imageFileError, videoFileError } from '../FileUpload';

const settings = { imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf', 'md'], fileMaxSizeMb: 3 };

describe('上传设置校验', () => {
    it('按分类应用格式和大小限制', () => {
        expect(imageFileError(new File(['x'], 'cover.png'), settings)).toBeNull();
        expect(imageFileError(new File(['x'], 'cover.jpg'), settings)).toContain('png');
        expect(fileUploadError(new File(['x'], 'report.pdf'), settings)).toBeNull();
        expect(fileUploadError(new File(['x'], 'readme.md'), settings)).toBeNull();
        expect(fileUploadError(new File(['x'], 'notes.txt'), settings)).toBe('不支持该文件类型');
        expect(videoFileError(new File(['x'], 'clip.mp4'), settings)).toBeNull();
        expect(videoFileError(new File(['x'], 'clip.pdf'), settings)).toContain('视频');
        expect(fileUploadError(new File(['x'], 'clip.webm'), settings)).toContain('视频格式');
        expect(fileUploadError(new File([new Uint8Array(3 * 1024 * 1024)], 'cover.png'), settings)).toContain('2 MB');
        expect(videoFileError(new File([new Uint8Array(6 * 1024 * 1024)], 'clip.mp4'), settings)).toContain('5 MB');
        expect(fileUploadError(new File([new Uint8Array(4 * 1024 * 1024)], 'readme.md'), settings)).toContain('3 MB');
    });
});
