import { act, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import { configKeys } from '@/hooks/queries/configs';
import type { ConfigView } from '@/types/api';
import ConfigsPage from '../ConfigsPage';

const failure = () => Response.json({ code: 100002, message: '读取失败', data: null }, { status: 500 });
const cases = ['config_system', 'config_sms'].flatMap(domain => ['配置分组', '配置项'].map(label => ({ domain: domain as 'config_system' | 'config_sms', label })));
function fixtures(domain: 'config_system' | 'config_sms') {
    const record: ConfigView = { id: 91, configKey: `${domain === 'config_sms' ? 'sms' : 'system'}.general.note`, configValue: '原值', configType: 'string', groupKey: 'general', fieldType: 'input', fieldOptions: null, required: true, description: '说明文字', isBuiltin: true, createdAt: '', updatedAt: '' };
    return { record, groups: [{ key: 'general', label: '通用设置', groupKey: domain, isBuiltin: true, canDelete: false, createdAt: '' }] };
}
afterEach(() => vi.unstubAllGlobals());

describe.each(cases)('$domain $label 读取恢复', ({ domain, label }) => {
    it('首次失败不展示成功空态，可以单独重试', async () => {
        let fail = true;
        const { record, groups } = fixtures(domain);
        const { calls } = mockFetch({
            'GET /api-backend/system/config/listAll': () => fail && label === '配置项' ? failure() : [record],
            'GET /api-backend/system/config/listGroups': () => fail && label === '配置分组' ? failure() : groups,
        });
        renderWithProviders(<ConfigsPage domain={domain} />);
        const alert = await screen.findByRole('alert', { name: `${label}加载失败` });
        expect(screen.queryByText('暂无配置分组')).not.toBeInTheDocument();
        expect(screen.queryByText('暂无配置项')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '新增配置项' })).toBeDisabled();
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.getByLabelText(/说明文字/)).toBeEnabled());
        expect(screen.getByLabelText(/说明文字/)).toHaveValue('原值');
        expect(calls.filter(call => call.path.endsWith(label === '配置分组' ? 'listGroups' : 'listAll'))).toHaveLength(2);
        expect(calls.filter(call => call.path.endsWith(label === '配置分组' ? 'listAll' : 'listGroups'))).toHaveLength(1);
    });

    it('刷新失败保留草稿并阻止保存，恢复后保存原草稿', async () => {
        let fail = false;
        const { record, groups } = fixtures(domain);
        const { client, calls } = (() => {
            const mock = mockFetch({
                'GET /api-backend/system/config/listAll': () => fail && label === '配置项' ? failure() : [record],
                'GET /api-backend/system/config/listGroups': () => fail && label === '配置分组' ? failure() : groups,
                'PUT /api-backend/system/config/update/91': null,
            });
            return { ...renderWithProviders(<ConfigsPage domain={domain} />), ...mock };
        })();
        const input = await screen.findByLabelText(/说明文字/);
        await waitFor(() => expect(input).toBeEnabled());
        fireEvent.change(input, { target: { value: '未保存草稿' } });
        fail = true;
        await act(async () => { await client.invalidateQueries({ queryKey: [...configKeys.all, label === '配置分组' ? 'groups' : 'all'] }); });
        const alert = await screen.findByRole('alert', { name: `${label}加载失败` });
        expect(input).toHaveValue('未保存草稿');
        expect(input).toBeDisabled();
        expect(screen.getByRole('button', { name: '保存本组' })).toBeDisabled();
        fireEvent.click(screen.getByRole('button', { name: '保存本组' }));
        expect(calls.every(call => call.method === 'GET')).toBe(true);
        fail = false;
        fireEvent.click(within(alert).getByRole('button', { name: '重试' }));
        await waitFor(() => expect(screen.getByRole('button', { name: '保存本组' })).toBeEnabled());
        expect(input).toHaveValue('未保存草稿');
        fireEvent.click(screen.getByRole('button', { name: '保存本组' }));
        await waitFor(() => expect(calls.find(call => call.method === 'PUT')?.body).toMatchObject({ configValue: '未保存草稿' }));
    });
});
