import { Table } from '@douyinfe/semi-ui';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PREFERENCES_STORAGE_KEY } from '@/lib/preferences-storage';
import RolesPage from '@/pages/system/roles/RolesPage';
import { mockFetch, page, renderWithProviders } from '@/test/helpers';
import { useTableDefaults } from '../useTableDefaults';
import { defaultPreferences, type UserPreferences } from '../usePreferences';

function savePrefs(patch: Partial<UserPreferences>) {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, ...patch }));
}

function DemoTable() {
    const { tableProps } = useTableDefaults();
    return <Table {...tableProps} rowKey="id" columns={[{ title: '名称', dataIndex: 'name' }]} dataSource={[{ id: 1, name: 'a' }, { id: 2, name: 'b' }]} pagination={false} />;
}

const tableRoot = () => document.querySelector('.weiran-table');

describe('useTableDefaults', () => {
    afterEach(() => vi.unstubAllGlobals());

    it('默认：紧凑 + 边框 + 无斑马纹', () => {
        renderWithProviders(<DemoTable />);
        expect(tableRoot()).not.toHaveClass('weiran-table--striped');
        expect(document.querySelector('.semi-table-small')).not.toBeNull();
        expect(document.querySelector('.semi-table-bordered')).not.toBeNull();
    });

    it('偏好改为宽松 + 无边框 + 斑马纹', () => {
        savePrefs({ tableSize: 'default', tableBordered: false, tableStriped: true });
        renderWithProviders(<DemoTable />);
        expect(tableRoot()).toHaveClass('weiran-table--striped');
        expect(document.querySelector('.semi-table-small')).toBeNull();
        expect(document.querySelector('.semi-table-bordered')).toBeNull();
    });

    it('列表页的初始每页条数读偏好 tablePageSize', async () => {
        savePrefs({ tablePageSize: 50 });
        const { calls } = mockFetch({ 'GET /api/roles': page([]), 'GET /api/dicts/code/sys_common_status/items': [] });
        renderWithProviders(<RolesPage />);
        await waitFor(() => expect(calls.some((c) => c.path === '/api/roles')).toBe(true));
        expect(calls.find((c) => c.path === '/api/roles')?.search).toContain('pageSize=50');
        expect(await screen.findByText('暂无数据')).toBeInTheDocument();
    });
});
