import { Table } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { defaultPreferences, type UserPreferences } from '@/hooks/usePreferences';
import { PREFERENCES_STORAGE_KEY } from '@/lib/preferences-storage';
import { renderWithProviders } from '@/test/helpers';
import { applyColumnState, COLUMN_SETTINGS_PREFIX, readColumnState, useColumnSettings } from '../ColumnSettings';

interface Row {
    id: number;
    name: string;
    code: string;
    status: string;
}

const COLUMNS: ColumnProps<Row>[] = [
    { title: '名称', dataIndex: 'name' },
    { title: '编码', dataIndex: 'code' },
    { title: '状态', dataIndex: 'status' },
    { title: '操作', dataIndex: 'actions', fixed: 'right' },
];

function Harness() {
    const { columns, columnSettings } = useColumnSettings('test/table', COLUMNS);
    return (
        <>
            {columnSettings}
            <Table<Row> rowKey="id" columns={columns} dataSource={[{ id: 1, name: 'a', code: 'b', status: 'c' }]} pagination={false} />
        </>
    );
}

function renderHarness(prefs: Partial<UserPreferences> = {}) {
    localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify({ ...defaultPreferences, ...prefs }));
    return renderWithProviders(<Harness />);
}

const headers = () => [...document.querySelectorAll('thead th')].map((th) => th.textContent);

async function openPanel() {
    fireEvent.click(screen.getByRole('button', { name: '列设置' }));
    return screen.findByLabelText('列设置', { selector: '.column-settings' });
}

describe('applyColumnState', () => {
    it('按保存顺序重排、去掉隐藏列；固定列与「操作」列保持原位不受影响；保存里没有的新列接在后面', () => {
        const cols = applyColumnState(COLUMNS, { order: ['status', 'name'], hidden: ['name', 'actions'] });
        expect(cols.map((c) => c.dataIndex)).toEqual(['status', 'code', 'actions']);
    });

    it('读到损坏的存储时回到空设置', () => {
        localStorage.setItem(`${COLUMN_SETTINGS_PREFIX}bad`, '{oops');
        expect(readColumnState('bad')).toEqual({ order: [], hidden: [] });
    });
});

describe('useColumnSettings / ColumnSettings', () => {
    it('隐藏列与调整顺序即时生效并按页面 key 存 localStorage；重新挂载后恢复', async () => {
        const { unmount } = renderHarness();
        expect(headers()).toEqual(['名称', '编码', '状态', '操作']);
        const panel = await openPanel();
        // 操作列（固定列）不出现在设置里
        expect(within(panel).queryByText('操作')).toBeNull();

        fireEvent.click(within(panel).getByRole('checkbox', { name: '编码' }));
        await waitFor(() => expect(headers()).toEqual(['名称', '状态', '操作']));
        fireEvent.click(within(panel).getByRole('button', { name: '上移 状态' }));
        await waitFor(() => expect(headers()).toEqual(['名称', '状态', '操作']));
        fireEvent.click(within(panel).getByRole('button', { name: '下移 名称' }));
        await waitFor(() => expect(headers()).toEqual(['状态', '名称', '操作']));

        expect(JSON.parse(localStorage.getItem(`${COLUMN_SETTINGS_PREFIX}test/table`) ?? 'null')).toEqual({
            order: ['status', 'name', 'code'],
            hidden: ['code'],
        });

        unmount();
        renderHarness();
        expect(headers()).toEqual(['状态', '名称', '操作']);
    });

    it('至少保留一列；恢复默认清掉保存的设置', async () => {
        localStorage.setItem(`${COLUMN_SETTINGS_PREFIX}test/table`, JSON.stringify({ order: [], hidden: ['name', 'code'] }));
        renderHarness();
        const panel = await openPanel();
        expect(within(panel).getByRole('checkbox', { name: '状态' })).toBeDisabled();

        fireEvent.click(within(panel).getByRole('button', { name: '恢复默认' }));
        await waitFor(() => expect(headers()).toEqual(['名称', '编码', '状态', '操作']));
        expect(localStorage.getItem(`${COLUMN_SETTINGS_PREFIX}test/table`)).toBeNull();
    });

    it('showTableColumnSettings=false：没有按钮，列按代码默认显示（保存的设置保留）', () => {
        localStorage.setItem(`${COLUMN_SETTINGS_PREFIX}test/table`, JSON.stringify({ order: [], hidden: ['name'] }));
        renderHarness({ showTableColumnSettings: false });
        expect(screen.queryByRole('button', { name: '列设置' })).toBeNull();
        expect(headers()).toEqual(['名称', '编码', '状态', '操作']);
        expect(localStorage.getItem(`${COLUMN_SETTINGS_PREFIX}test/table`)).not.toBeNull();
    });
});
