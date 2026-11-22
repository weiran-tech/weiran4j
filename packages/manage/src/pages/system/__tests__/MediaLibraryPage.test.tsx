import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import { systemMediaKeys } from '@/hooks/queries/system-media';
import ResourceManagementPage from '../media-library';

const settings = { imageFormats: ['png'], imageMaxSizeMb: 10, videoFormats: ['mp4'], videoMaxSizeMb: 100, fileFormats: ['pdf'], fileMaxSizeMb: 10 };
const media = { id: 42, originalName: '示例.pdf', url: '/system-uploads/example.pdf', size: 1024, createdAt: '2026-11-22 12:34:56', category: 'document', references: [] };
const failure = () => Response.json({ code: 100002, message: '读取失败', data: null }, { status: 500 });

it('资源首次失败不展示空记录，重试成功才展示真实空态', async () => {
    let fail = true;
    mockFetch({ 'GET /api-backend/system/mediaLibrary/list': () => fail ? failure() : page([]), 'GET /api-backend/system/media/getUploadSettings': settings });
    renderWithProviders(<ResourceManagementPage />);
    const alert = await screen.findByRole('alert', { name: '资源列表加载失败' });
    expect(screen.queryByText('暂无记录')).not.toBeInTheDocument();
    expect(screen.queryByText('暂无数据')).not.toBeInTheDocument();
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    expect(await screen.findByText('暂无记录')).toBeInTheDocument();
    expect(screen.queryByRole('alert', { name: '资源列表加载失败' })).not.toBeInTheDocument();
});

it('缓存刷新失败保留资源，显示上次数据说明并可重试恢复', async () => {
    let fail = false;
    const { calls } = mockFetch({ 'GET /api-backend/system/mediaLibrary/list': () => fail ? failure() : page([media]), 'GET /api-backend/system/media/getUploadSettings': settings });
    const { client } = renderWithProviders(<ResourceManagementPage />);
    expect(await screen.findByText(media.originalName)).toBeInTheDocument();
    fail = true;
    await act(async () => { await client.invalidateQueries({ queryKey: systemMediaKeys.all }); });
    const alert = await screen.findByRole('alert', { name: '资源列表加载失败' });
    expect(within(alert).getByText('更新失败，当前显示上次加载的数据。')).toBeInTheDocument();
    expect(screen.getByText(media.originalName)).toBeInTheDocument();
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.queryByRole('alert', { name: '资源列表加载失败' })).not.toBeInTheDocument());
    expect(calls.every(call => call.method === 'GET')).toBe(true);
});

it('上传配置失败禁用上传，恢复后开放；筛选空态可以清空条件', async () => {
    let fail = true;
    mockFetch({ 'GET /api-backend/system/mediaLibrary/list': page([]), 'GET /api-backend/system/media/getUploadSettings': () => fail ? failure() : settings });
    renderWithProviders(<ResourceManagementPage />);
    const alert = await screen.findByRole('alert', { name: '上传配置加载失败' });
    expect(screen.getByRole('button', { name: '上传文件' })).toBeDisabled();
    fail = false;
    fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
    await waitFor(() => expect(screen.getByRole('button', { name: '上传文件' })).toBeEnabled());
    fireEvent.change(screen.getByPlaceholderText('按文件名搜索'), { target: { value: '不存在' } });
    fireEvent.click(screen.getByRole('button', { name: /^搜索$/ }));
    fireEvent.click(await screen.findByRole('button', { name: '清空条件' }));
    await waitFor(() => expect(screen.getByPlaceholderText('按文件名搜索')).toHaveValue(''));
    expect(await screen.findByText('暂无记录')).toBeInTheDocument();
});
