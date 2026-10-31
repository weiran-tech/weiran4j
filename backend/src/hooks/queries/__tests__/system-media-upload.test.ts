import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
    get: vi.fn(),
    post: vi.fn(),
    getSession: vi.fn(),
    error: vi.fn(),
}));

vi.mock('@/utils/request', () => ({ http: { get: mocks.get, post: mocks.post } }));
vi.mock('@/utils/session', () => ({ getSession: mocks.getSession }));
vi.mock('@douyinfe/semi-ui', () => ({ Toast: { error: mocks.error } }));

const authorization = {
    uploadUrl: 'https://bucket.oss-cn-hangzhou.aliyuncs.com',
    keyPrefix: 'media/202610/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa/',
    accessKeyId: 'public-key-id',
    policy: 'policy',
    signature: 'signature',
    expiresAt: new Date(Date.now() + 15 * 60_000).toISOString(),
    ticket: 'signed-ticket',
};

beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mocks.getSession.mockReturnValue('1.session');
    mocks.post.mockResolvedValue({ url: 'https://cdn.example.com/image.png' });
    vi.stubGlobal('crypto', { randomUUID: () => 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb' });
});

afterEach(() => vi.unstubAllGlobals());

describe('uploadSystemFile', () => {
    it('OSS 模式复用未过期授权，直传成功后才向服务端登记', async () => {
        mocks.get.mockResolvedValue(authorization);
        const upload = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', upload);
        const { uploadSystemFile } = await import('../system-media');
        const file = new File(['image'], 'cover.PNG', { type: 'image/png' });

        await uploadSystemFile(file);
        await uploadSystemFile(file);

        expect(mocks.get).toHaveBeenCalledTimes(1);
        expect(upload).toHaveBeenCalledTimes(2);
        const body = upload.mock.calls[0]?.[1]?.body as FormData;
        expect(body.get('key')).toBe(`${authorization.keyPrefix}bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.png`);
        expect(body.get('OSSAccessKeyId')).toBe('public-key-id');
        expect(body.get('x-oss-forbid-overwrite')).toBe('true');
        expect(mocks.post).toHaveBeenCalledWith('/api-backend/system/media/completeDirectUpload', expect.objectContaining({
            originalName: 'cover.PNG',
            size: file.size,
            ticket: 'signed-ticket',
        }));
    });

    it('本地模式继续发送文件给后端，账号切换后重新获取授权', async () => {
        mocks.get.mockResolvedValueOnce(null).mockResolvedValueOnce(authorization);
        const upload = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', upload);
        const { uploadSystemFile } = await import('../system-media');
        const file = new File(['image'], 'cover.png', { type: 'image/png' });

        await uploadSystemFile(file);
        expect(mocks.post.mock.calls[0]?.[1]).toBeInstanceOf(FormData);
        mocks.getSession.mockReturnValue('2.session');
        await uploadSystemFile(file);
        expect(mocks.get).toHaveBeenCalledTimes(2);
        expect(upload).toHaveBeenCalledTimes(1);
    });

    it('OSS 直传接受上传配置允许的较长扩展名', async () => {
        mocks.get.mockResolvedValue(authorization);
        const upload = vi.fn().mockResolvedValue({ ok: true, status: 204 });
        vi.stubGlobal('fetch', upload);
        const { uploadSystemFile } = await import('../system-media');

        await uploadSystemFile(new File(['notes'], 'notes.markdown'));

        const body = upload.mock.calls[0]?.[1]?.body as FormData;
        expect(body.get('key')).toBe(`${authorization.keyPrefix}bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb.markdown`);
    });

    it('OSS 直传上报实际发送进度，完成后再登记文件', async () => {
        mocks.get.mockResolvedValue(authorization);
        const progress = vi.fn();
        const xhr = {
            upload: { onprogress: null as ((event: ProgressEvent) => void) | null },
            onload: null as (() => void) | null,
            onerror: null as (() => void) | null,
            status: 204,
            withCredentials: true,
            open: vi.fn(),
            send: vi.fn(() => {
                xhr.upload.onprogress?.({ lengthComputable: true, loaded: 2, total: 4 } as ProgressEvent);
                xhr.upload.onprogress?.({ lengthComputable: true, loaded: 4, total: 4 } as ProgressEvent);
                xhr.onload?.();
            }),
        };
        vi.stubGlobal('XMLHttpRequest', function XMLHttpRequestMock() { return xhr; });
        vi.stubGlobal('fetch', vi.fn());
        const { uploadSystemFile } = await import('../system-media');

        await uploadSystemFile(new File(['image'], 'cover.png'), progress);

        expect(xhr.open).toHaveBeenCalledWith('POST', authorization.uploadUrl);
        expect(xhr.withCredentials).toBe(false);
        expect(progress.mock.calls.map(([percent]) => percent)).toEqual([50, 100, 100]);
        expect(mocks.post).toHaveBeenCalledWith('/api-backend/system/media/completeDirectUpload', expect.any(Object));
        expect(fetch).not.toHaveBeenCalled();
    });
});
