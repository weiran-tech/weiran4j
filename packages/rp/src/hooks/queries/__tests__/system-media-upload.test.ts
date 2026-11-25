import { expect, it, vi } from 'vitest';
import { signIn } from '@/test/session';
import { uploadSystemFile } from '../system-media';
vi.unmock('@/mocks/transport');

it('上传保存在本地并可从资源库查询，不发网络请求', async () => {
    signIn();
    const network = vi.spyOn(globalThis, 'fetch');
    const progress = vi.fn();
    const file = new File(['prototype'], 'sample.txt', { type: 'text/plain' });
    const uploaded = await uploadSystemFile(file, progress);
    expect(uploaded.url).toMatch(/^data:text\/plain;base64,/);
    expect(uploaded.name).toBe('sample.txt');
    expect(progress).toHaveBeenLastCalledWith(100);
    expect(network).not.toHaveBeenCalled();
    network.mockRestore();
});
