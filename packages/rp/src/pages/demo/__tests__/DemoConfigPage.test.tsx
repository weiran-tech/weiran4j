import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { mockFetch, renderWithProviders } from '@/test/helpers';
import type { ConfigView } from '@/types/api';
import DemoConfigPage from '../DemoConfigPage';

const sampleConfig: ConfigView = {
    id: 77,
    configKey: 'system.demo.samples',
    configValue: '{}',
    configType: 'json',
    groupKey: 'demo',
    fieldType: 'json',
    fieldOptions: null,
    required: false,
    description: '组件演示保存值',
    isBuiltin: true,
    createdAt: '',
    updatedAt: '',
};

describe('DemoConfigPage 示例值持久化', () => {
    it('保存调用配置接口，重新加载后从数据库值恢复', async () => {
        let stored = '{}';
        const fetch = mockFetch({
            'GET /api-backend/system/config/listAll': () => [{ ...sampleConfig, configValue: stored }],
            'PUT /api-backend/system/config/update/77': (init?: RequestInit) => {
                const body = JSON.parse(typeof init?.body === 'string' ? init.body : '{}') as { configValue: string };
                stored = body.configValue;
                return null;
            },
        });
        const first = renderWithProviders(<DemoConfigPage />);
        fireEvent.click(await screen.findByText('开关', { selector: '.nav-list-item__primary' }));
        fireEvent.click(screen.getByRole('button', { name: '保存本组' }));

        await waitFor(() => expect(fetch.calls.some((call) => call.method === 'PUT' && call.path === '/api-backend/system/config/update/77')).toBe(true));
        const values = JSON.parse(stored) as Record<string, string>;
        expect(Object.values(values)).toEqual(['true', 'false']);

        first.unmount();
        renderWithProviders(<DemoConfigPage />);
        fireEvent.click(await screen.findByText('开关', { selector: '.nav-list-item__primary' }));
        expect(await screen.findByText('查看数据库中保存的示例值')).toBeInTheDocument();
    });
});
