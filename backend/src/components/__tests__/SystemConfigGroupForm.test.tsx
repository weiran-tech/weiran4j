import { act, fireEvent, screen, waitFor } from '@testing-library/react';
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

it('单图字段只接受配置允许的图片，并拒绝拖入视频', async () => {
    mockFetch({
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
    });
    const onUploadFile = vi.fn(() => Promise.resolve('/system-uploads/cover.png'));
    const { container } = renderWithProviders(<SystemConfigGroupForm
        records={[{ ...multiFileConfig, id: 43, configKey: 'system.demo.image', configValue: '', configType: 'string', fieldType: 'image', fieldOptions: '["image","video"]' }]}
        canEdit showSettings={false} onEdit={() => undefined} onUploadFile={onUploadFile}
    />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).toBeEnabled();
        return element;
    });
    expect(input).toHaveAttribute('accept', '.png');
    await act(async () => {
        fireEvent.drop(screen.getByRole('button', { name: '上传图片' }), { dataTransfer: { files: [new File(['video'], 'clip.mp4')] } });
        await Promise.resolve();
    });
    expect(onUploadFile).not.toHaveBeenCalled();
    await act(async () => {
        fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png')] } });
        await Promise.resolve();
    });
    expect(onUploadFile).toHaveBeenCalledOnce();
});

it.each([
    { fieldType: 'video' as const, accepted: '.mp4', allowed: 'clip.mp4', rejected: 'cover.png', label: '上传视频' },
    { fieldType: 'file' as const, accepted: '.pdf', allowed: 'report.pdf', rejected: 'clip.mp4', label: '上传文件' },
])('$fieldType 字段只接受对应上传类型', async ({ fieldType, accepted, allowed, rejected, label }) => {
    mockFetch({
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
    });
    const onUploadFile = vi.fn(() => Promise.resolve(`/system-uploads/${allowed}`));
    const { container } = renderWithProviders(<SystemConfigGroupForm
        records={[{ ...multiFileConfig, id: 44, configKey: `system.demo.${fieldType}`, configValue: '', configType: 'string', fieldType }]}
        canEdit showSettings={false} onEdit={() => undefined} onUploadFile={onUploadFile}
    />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).toBeEnabled();
        return element;
    });
    expect(input).toHaveAttribute('accept', accepted);
    await act(async () => {
        fireEvent.drop(screen.getByRole('button', { name: label }), { dataTransfer: { files: [new File(['wrong'], rejected)] } });
        await Promise.resolve();
    });
    expect(onUploadFile).not.toHaveBeenCalled();
    await act(async () => {
        fireEvent.change(input!, { target: { files: [new File(['right'], allowed)] } });
        await Promise.resolve();
    });
    expect(onUploadFile).toHaveBeenCalledOnce();
});

it('多文件字段可组合图片和视频，拒绝普通文件', async () => {
    mockFetch({
        'GET /api-backend/system/media/getUploadSettings': {
            imageFormats: ['png'], imageMaxSizeMb: 2, videoFormats: ['mp4'], videoMaxSizeMb: 5, fileFormats: ['pdf'], fileMaxSizeMb: 3,
        },
    });
    const onUploadFile = vi.fn((file: File) => Promise.resolve(`/system-uploads/${file.name}`));
    const { container } = renderWithProviders(<SystemConfigGroupForm
        records={[{ ...multiFileConfig, id: 45, configKey: 'system.demo.mixed', configValue: '[]', fieldType: 'files', fieldOptions: '["image","video"]' }]}
        canEdit showSettings={false} onEdit={() => undefined} onUploadFile={onUploadFile}
    />);
    const input = await waitFor(() => {
        const element = container.querySelector('input[type="file"]');
        expect(element).toBeEnabled();
        return element;
    });
    expect(input).toHaveAttribute('accept', '.png,.mp4');
    await act(async () => {
        fireEvent.drop(screen.getByRole('button', { name: '上传多个图片、视频' }), { dataTransfer: { files: [new File(['pdf'], 'report.pdf')] } });
        await Promise.resolve();
    });
    expect(onUploadFile).not.toHaveBeenCalled();
    await act(async () => {
        fireEvent.change(input!, { target: { files: [new File(['image'], 'cover.png'), new File(['video'], 'clip.mp4')] } });
        await Promise.resolve();
    });
    expect(onUploadFile).toHaveBeenCalledTimes(2);
});
