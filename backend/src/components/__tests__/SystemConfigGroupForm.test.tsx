import { fireEvent, screen, waitFor } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { ConfigView } from '@/types/api';
import { SystemConfigGroupForm } from '../SystemConfigGroupForm';

const multiFileConfig: ConfigView = {
    id: 42,
    configKey: 'system.demo.images',
    configValue: '["/first.pdf"]',
    configType: 'json',
    groupKey: 'demo',
    fieldType: 'json',
    fieldOptions: null,
    required: false,
    description: '多文件上传 · FileUpload',
    isBuiltin: true,
    createdAt: '2026-10-22 00:00:00',
    updatedAt: '2026-10-22 00:00:00',
};

it('将旧演示 JSON 字段显示为多文件上传并保存 URL 数组', async () => {
    mockFetch({});
    const onSave = vi.fn();
    renderWithProviders(<SystemConfigGroupForm records={[multiFileConfig]} canEdit showSettings={false} onEdit={() => undefined} onSave={onSave} />);

    expect(screen.getByRole('button', { name: '上传多个文件' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox', { name: '多文件上传 · FileUpload' })).not.toBeInTheDocument();
    expect(screen.queryByText('42')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '移除文件 1' }));
    fireEvent.click(screen.getByRole('button', { name: '保存本组' }));

    await waitFor(() => expect(onSave).toHaveBeenCalledWith([expect.objectContaining({
        configKey: 'system.demo.images',
        configType: 'json',
        fieldType: 'json',
        configValue: '[]',
    })]));
});
