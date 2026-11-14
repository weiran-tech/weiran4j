import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { systemMediaKeys } from '@/hooks/queries/system-media';
import { configKeys } from '@/hooks/queries/configs';
import SecuritySettingsPage from '../SecuritySettingsPage';
import UploadSettingsPage from '../../upload-settings/UploadSettingsPage';

const failure = () => Response.json({ code: 100002, message: '读取失败', data: null }, { status: 500 });
const security = { passwordMinLength: 12, passwordMaxLength: 64, requireLower: true, requireUpper: false, requireDigit: true, requireSymbol: false, mfaEnabled: false, mfaRememberDays: 7, revision: 1 };
const upload = { imageFormats: ['png'], imageMaxSizeMb: 20, videoFormats: ['mp4'], videoMaxSizeMb: 50, fileFormats: ['pdf'], fileMaxSizeMb: 30 };
const configs = Object.entries({ image_formats: 'png', image_max_size_mb: '20', video_formats: 'mp4', video_max_size_mb: '50', file_formats: 'pdf', file_max_size_mb: '30' }).map(([key, value], index) => ({ id: index + 1, configKey: `system.upload.${key}`, configValue: value, configType: 'string', groupKey: 'upload', fieldType: 'text', fieldOptions: null, required: true, description: key }));

afterEach(() => vi.unstubAllGlobals());

describe('安全设置读取恢复', () => {
    it('首次失败显示重试，恢复后显示真实策略', async () => {
        let fail = true;
        const { calls } = mockFetch({ 'GET /api-backend/system/security/get': () => fail ? failure() : security });
        renderWithProviders(<SecuritySettingsPage />);
        const alert = await screen.findByRole('alert', { name: '安全设置加载失败' });
        expect(screen.queryByText(/正在读取/)).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        expect(await screen.findByText('12–64 个字符')).toBeInTheDocument();
        await waitFor(() => expect(screen.getAllByRole('button', { name: '修改' })[0]).toBeEnabled());
        expect(calls.every((call) => call.method === 'GET')).toBe(true);
    });

    it('抽屉打开后刷新失败保留值与草稿，禁止提交；恢复后可保存', async () => {
        let fail = false;
        const { calls } = mockFetch({ 'GET /api-backend/system/security/get': () => fail ? failure() : security, 'PUT /api-backend/system/security/updatePasswordRules': null });
        const { client } = renderWithProviders(<SecuritySettingsPage />);
        fireEvent.click((await screen.findAllByRole('button', { name: '修改' }))[0]!);
        fireEvent.change(screen.getByLabelText('密码最小长度'), { target: { value: '16' } });
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: ['security', 'settings'] }); });
        const sheet = screen.getByText('修改密码策略').closest('.semi-sidesheet') as HTMLElement;
        await within(sheet).findByRole('alert', { name: '安全设置加载失败' });
        expect(within(sheet).getByRole('button', { name: '保存' })).toBeDisabled();
        fireEvent.click(within(sheet).getByRole('button', { name: '保存' }));
        expect(calls.every((call) => call.method === 'GET')).toBe(true);
        expect(screen.getByLabelText('密码最小长度')).toHaveValue('16');
        fail = false;
        fireEvent.click(within(sheet).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(within(sheet).getByRole('button', { name: '保存' })).toBeEnabled());
        expect(screen.getByLabelText('密码最小长度')).toHaveValue('16');
        fireEvent.click(within(sheet).getByRole('button', { name: '保存' }));
        await waitFor(() => expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ minLength: 16 }));
    });
});

describe('上传设置读取恢复', () => {
    it.each(['上传规则', '配置列表'])('%s 首次失败可以单独重试', async (label) => {
        let fail = true;
        const { calls } = mockFetch({
            'GET /api-backend/system/media/getUploadSettings': () => fail && label === '上传规则' ? failure() : upload,
            'GET /api-backend/system/config/listAll': () => fail && label === '配置列表' ? failure() : configs,
        });
        renderWithProviders(<UploadSettingsPage />);
        const alert = await screen.findByRole('alert', { name: `${label}加载失败` });
        expect(screen.getByRole('button', { name: '保存上传配置' })).toBeDisabled();
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '保存上传配置' })).toBeEnabled());
        expect(calls.filter((call) => call.path.endsWith(label === '上传规则' ? 'getUploadSettings' : 'listAll'))).toHaveLength(2);
        expect(calls.filter((call) => call.path.endsWith(label === '上传规则' ? 'listAll' : 'getUploadSettings'))).toHaveLength(1);
    });

    it.each(['上传规则', '配置列表'])('%s 刷新失败不丢失输入，恢复后提交草稿', async (label) => {
        let fail = false;
        const { calls } = mockFetch({
            'GET /api-backend/system/media/getUploadSettings': () => fail && label === '上传规则' ? failure() : upload,
            'GET /api-backend/system/config/listAll': () => fail && label === '配置列表' ? failure() : configs,
            'PUT /api-backend/system/config/update/2': null,
        });
        const { client } = renderWithProviders(<UploadSettingsPage />);
        await waitFor(() => expect(screen.getByRole('button', { name: '保存上传配置' })).toBeEnabled());
        const input = document.getElementById('image-size')!;
        fireEvent.change(input, { target: { value: '25' } });
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: label === '上传规则' ? systemMediaKeys.uploadSettings : configKeys.all }); });
        const alert = await screen.findByRole('alert', { name: `${label}加载失败` });
        fireEvent.click(screen.getByRole('button', { name: '保存上传配置' }));
        expect(calls.every((call) => call.method === 'GET')).toBe(true);
        expect(input).toHaveValue(25);
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '保存上传配置' })).toBeEnabled());
        expect(input).toHaveValue(25);
        fireEvent.click(screen.getByRole('button', { name: '保存上传配置' }));
        await waitFor(() => expect(calls.find((call) => call.method === 'PUT')?.body).toMatchObject({ configValue: '25' }));
    });
});
