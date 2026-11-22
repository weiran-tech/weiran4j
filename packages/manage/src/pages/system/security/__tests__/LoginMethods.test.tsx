import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { configKeys } from '@/hooks/queries/configs';
import type { ConfigView } from '@/types/api';
import SecuritySettingsPage from '../SecuritySettingsPage';
import ConfigsPage from '../../configs/ConfigsPage';

const security = { passwordMinLength: 8, passwordMaxLength: 64, requireLower: true, requireUpper: false, requireDigit: true, requireSymbol: false, mfaEnabled: false, mfaRememberDays: 7, revision: 1 };
const record: ConfigView = { id: 42, configKey: 'system.user.enable_phone_login', configValue: 'true', configType: 'boolean', groupKey: 'user', fieldType: 'switch', fieldOptions: null, required: true, description: '启用手机号+短信验证码登录', isBuiltin: true, createdAt: '', updatedAt: '' };
const failure = () => Response.json({ code: 100002, message: '读取失败', data: null }, { status: 500 });
const group = () => screen.getByRole('heading', { name: '登录方式', level: 3 }).closest('section')!;

afterEach(() => vi.unstubAllGlobals());

describe('登录方式配置入口', () => {
    it('显示原值并通过原配置接口保存，仅变更该开关', async () => {
        let value = record.configValue;
        const { calls } = mockFetch({
            'GET /api-backend/system/security/get': security,
            'GET /api-backend/system/config/listAll': () => [{ ...record, configValue: value }],
            'PUT /api-backend/system/config/update/42': (init?: RequestInit) => { value = JSON.parse(typeof init?.body === 'string' ? init.body : '{}').configValue; return null; },
        });
        renderWithProviders(<SecuritySettingsPage />);
        await screen.findByRole('heading', { name: '登录方式' });
        expect(await within(group()).findByText('已启用')).toBeInTheDocument();
        fireEvent.click(within(group()).getByRole('button', { name: '修改' }));
        const toggle = screen.getByRole('checkbox', { name: '启用手机号+短信验证码登录' });
        expect(toggle).toBeChecked();
        fireEvent.click(toggle);
        fireEvent.click(screen.getByRole('button', { name: '保存' }));
        await waitFor(() => expect(within(group()).getByText('未启用')).toBeInTheDocument());
        expect(calls.filter(call => call.method === 'PUT')).toEqual([expect.objectContaining({ path: '/api-backend/system/config/update/42', body: {
            configKey: record.configKey, configValue: 'false', configType: 'boolean', groupKey: 'user', fieldType: 'switch', fieldOptions: null, required: true, description: record.description,
        } })]);
    });

    it('刷新失败保留草稿，恢复前禁用保存；恢复后可重试', async () => {
        let fail = false;
        const { calls } = mockFetch({ 'GET /api-backend/system/security/get': security, 'GET /api-backend/system/config/listAll': () => fail ? failure() : [record], 'PUT /api-backend/system/config/update/42': null });
        const { client } = renderWithProviders(<SecuritySettingsPage />);
        await screen.findByRole('heading', { name: '登录方式' });
        await waitFor(() => expect(within(group()).getByRole('button', { name: '修改' })).toBeEnabled());
        fireEvent.click(within(group()).getByRole('button', { name: '修改' }));
        fireEvent.click(screen.getByRole('checkbox', { name: '启用手机号+短信验证码登录' }));
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: configKeys.all }); });
        await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeDisabled());
        expect(screen.getByRole('checkbox', { name: '启用手机号+短信验证码登录' })).not.toBeChecked();
        expect(calls.every(call => call.method === 'GET')).toBe(true);
        fail = false;
        const sheet = screen.getByText('修改登录方式').closest<HTMLElement>('.semi-sidesheet')!;
        fireEvent.click(within(sheet).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '保存' })).toBeEnabled());
        expect(screen.getByRole('checkbox', { name: '启用手机号+短信验证码登录' })).not.toBeChecked();
    });

    it('首次失败显示重试，成功但缺少配置时不伪造关闭状态', async () => {
        let fail = true;
        mockFetch({ 'GET /api-backend/system/security/get': security, 'GET /api-backend/system/config/listAll': () => fail ? failure() : [] });
        renderWithProviders(<SecuritySettingsPage />);
        const alert = await screen.findByRole('alert', { name: '登录方式加载失败' });
        expect(within(group()).getByRole('button', { name: '修改' })).toBeDisabled();
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        expect(await screen.findByText('未找到手机号登录配置，请检查系统配置数据。')).toBeInTheDocument();
        expect(within(group()).queryByText('未启用')).not.toBeInTheDocument();
    });

    it('无配置读取权限不发起配置请求；只有读取权限不显示修改', async () => {
        const { calls } = mockFetch({ 'GET /api-backend/system/security/get': security, 'GET /api-backend/system/config/listAll': [record] });
        const first = renderWithProviders(<SecuritySettingsPage />, { permissions: ['system:security:list'] });
        await screen.findByRole('heading', { name: '密码策略' });
        expect(screen.queryByRole('heading', { name: '登录方式' })).not.toBeInTheDocument();
        expect(calls.some(call => call.path.endsWith('listAll'))).toBe(false);
        first.unmount();
        renderWithProviders(<SecuritySettingsPage />, { permissions: ['system:security:list', 'system:config:list'] });
        await screen.findByRole('heading', { name: '登录方式' });
        expect(await within(group()).findByText('已启用')).toBeInTheDocument();
        expect(within(group()).queryByRole('button', { name: '修改' })).not.toBeInTheDocument();
    });

    it('原分组只有手机号登录开关时显示迁移提示，不显示空的保存按钮', async () => {
        mockFetch({ 'GET /api-backend/system/config/listAll': [record], 'GET /api-backend/system/config/listGroups': [{ key: 'user', label: '用户', groupKey: 'config_system', isBuiltin: true, canDelete: false, createdAt: '' }] });
        renderWithProviders(<ConfigsPage />);
        expect(await screen.findByText('手机号登录方式已移至安全设置，可在此新增其他用户配置')).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: '保存本组' })).not.toBeInTheDocument();
    });

    it('系统配置用户分组保留其他字段并隐藏手机号登录开关', async () => {
        mockFetch({ 'GET /api-backend/system/config/listAll': [record, { ...record, id: 43, configKey: 'system.user.other', description: '其他用户配置' }], 'GET /api-backend/system/config/listGroups': [{ key: 'user', label: '用户', groupKey: 'config_system', isBuiltin: true, canDelete: false, createdAt: '' }] });
        renderWithProviders(<ConfigsPage />);
        expect(await screen.findByText('其他用户配置')).toBeInTheDocument();
        expect(screen.queryByText(record.description!)).not.toBeInTheDocument();
    });
});
