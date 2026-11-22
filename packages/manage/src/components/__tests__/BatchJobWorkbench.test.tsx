import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { BatchJobWorkbench, type BatchJob, type BatchJobDataSource } from '../BatchJobWorkbench';

it('注入任务数据源后读取、创建与取消都使用调用方动作，不请求系统接口', async () => {
    const { fn: fetch } = mockFetch({});
    const job: BatchJob = { id: 7, kind: 'custom', sourceName: 'input.xlsx', status: 'queued', phase: 'waiting', total: null, selectedCount: null, processed: 0, succeeded: 0, failed: 0, errorMessage: null, decidedAt: null, createdAt: '2026-11-23 10:00:00', finishedAt: null };
    const source: BatchJobDataSource = {
        list: vi.fn(() => Promise.resolve([])),
        get: vi.fn(() => Promise.resolve(job)),
        create: vi.fn(() => Promise.resolve(job)),
        cancel: vi.fn(() => Promise.resolve({ ...job, status: 'cancelled', phase: 'finished' })),
        details: vi.fn(() => Promise.resolve({ list: [], total: 0, page: 1, pageSize: 20 })),
    };
    renderWithProviders(<BatchJobWorkbench title="任务" description="调用方数据源" kinds={[{ value: 'custom', label: '导入', accept: '.xlsx' }]} dataSource={source} />);
    await waitFor(() => expect(source.list).toHaveBeenCalledWith('custom'));
    const file = new File(['test'], 'input.xlsx');
    fireEvent.change(screen.getByLabelText('选择批处理文件'), { target: { files: [file] } });
    fireEvent.click(screen.getByRole('button', { name: '上传并开始处理' }));
    await waitFor(() => expect(source.create).toHaveBeenCalledWith('custom', file));
    await waitFor(() => expect(screen.getByRole('button', { name: '取消任务' })).toBeInTheDocument());
    fireEvent.click(screen.getByRole('button', { name: '取消任务' }));
    await waitFor(() => expect(source.cancel).toHaveBeenCalledWith(7));
    expect(source.get).toHaveBeenCalledWith(7);
    expect(fetch).not.toHaveBeenCalled();
});
