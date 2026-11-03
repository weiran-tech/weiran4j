import { Input, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { DictSelect } from '@/components/DictSelect';
import { DictTag } from '@/components/DictTag';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDictOptions } from '@/hooks/queries/dicts';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import './demo.css';

interface DemoRow {
    id: number;
    name: string;
    description: string;
    status: 'enabled' | 'disabled';
    gender: 'male' | 'female';
}

interface Filters {
    keyword: string;
    status: string | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', status: undefined };
const INITIAL_ROWS: DemoRow[] = [
    { id: 3, name: '产品设计', description: '演示列设置和表格操作', status: 'enabled', gender: 'female' },
    { id: 2, name: '研发协作', description: '演示搜索条件和字典标签', status: 'enabled', gender: 'male' },
    { id: 1, name: '归档示例', description: '演示禁用状态', status: 'disabled', gender: 'female' },
];

export default function DemoListPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [rows, setRows] = useState(INITIAL_ROWS);
    const statusOptions = useDictOptions('sys_common_status');
    const { tableProps } = useTableDefaults();

    const search = () => setFilters({ keyword: draft.keyword.trim(), status: draft.status });
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
    };
    const remove = (field: keyof Filters) => () => {
        setDraft((value) => ({ ...value, [field]: EMPTY_FILTERS[field] }));
        setFilters((value) => ({ ...value, [field]: EMPTY_FILTERS[field] }));
    };
    const conditions: SearchCondition[] = [
        ...(filters.keyword ? [{ key: 'keyword', label: '名称', value: filters.keyword, onRemove: remove('keyword') }] : []),
        ...(filters.status
            ? [{
                  key: 'status',
                  label: '状态',
                  value: statusOptions.find((option) => option.value === filters.status)?.label ?? filters.status,
                  onRemove: remove('status'),
              }]
            : []),
    ];
    const visibleRows = rows.filter((row) =>
        row.name.includes(filters.keyword) && (!filters.status || row.status === filters.status),
    );
    const columns: ColumnProps<DemoRow>[] = [
        { title: 'ID', dataIndex: 'id', width: 180 },
        { title: '名称', dataIndex: 'name', width: 150 },
        { title: '说明', dataIndex: 'description' },
        { title: '性别字典', dataIndex: 'gender', width: 100, render: (value: string) => <DictTag dictCode="sys_user_gender" value={value} /> },
        { title: '状态', dataIndex: 'status', width: 76, render: (value: string) => <StatusTag value={value} /> },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 120 },
    ];
    const actionsOf = (row: DemoRow): TableAction[] => [
        { key: 'view', label: '查看', onClick: () => Toast.info(`${row.name}：${row.description}`) },
        {
            key: 'toggle',
            label: row.status === 'enabled' ? '禁用' : '启用',
            onClick: () => setRows((current) => current.map((item) =>
                item.id === row.id ? { ...item, status: item.status === 'enabled' ? 'disabled' : 'enabled' } : item,
            )),
        },
    ];
    const { columns: settledColumns, columnSettings } = useColumnSettings('demo/list', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer title="列表与筛选" extra={<span className="demo-page__hint">使用本地示例数据，操作仅影响当前页面</span>}>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => setRows(INITIAL_ROWS)}
                conditions={conditions}
                advanced={
                    <>
                        <SearchField label="名称">
                            <Input placeholder="输入示例名称" value={draft.keyword} onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))} showClear />
                        </SearchField>
                        <SearchField label="状态">
                            <DictSelect dictCode="sys_common_status" value={draft.status} onChange={(status) => setDraft((value) => ({ ...value, status }))} style={{ width: '100%' }} />
                        </SearchField>
                    </>
                }
            >
                <Input placeholder="输入示例名称" value={draft.keyword} onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))} onEnterPress={search} showClear style={{ width: 180 }} />
                <DictSelect dictCode="sys_common_status" value={draft.status} onChange={(status) => setDraft((value) => ({ ...value, status }))} placeholder="状态" />
            </SearchToolbar>
            <Table<DemoRow>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={visibleRows}
                pagination={false}
                scroll={{ x: tableScrollX(tableColumns) }}
            />
        </PageContainer>
    );
}
