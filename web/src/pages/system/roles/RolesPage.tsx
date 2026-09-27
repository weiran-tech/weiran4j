import { Button, Input, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { DictSelect } from '@/components/DictSelect';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useDictOptions } from '@/hooks/queries/dicts';
import { useDeleteRole, useRoleList } from '@/hooks/queries/roles';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { RoleQuery, RoleView, Status } from '@/types/api';
import { RoleFormModal } from './RoleFormModal';
import { RoleMenuSheet } from './RoleMenuSheet';

interface Filters {
    keyword: string;
    status: Status | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', status: undefined };

function toQuery(f: Filters, page: number, pageSize: number): RoleQuery {
    return {
        page,
        pageSize,
        ...(f.keyword.trim() ? { keyword: f.keyword.trim() } : {}),
        ...(f.status ? { status: f.status } : {}),
    };
}

export default function RolesPage() {
    const { hasAnyPermission } = usePermission();
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [editing, setEditing] = useState<RoleView | null | undefined>(undefined);
    const [assigning, setAssigning] = useState<RoleView | null>(null);

    const { data, isFetching, refetch } = useRoleList(toQuery(filters, page, pageSize));
    const deleteRole = useDeleteRole();

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    // 已选条件只反映已生效的查询；删掉一个即清空该字段（草稿一并清）并回第 1 页
    const statusOptions = useDictOptions('sys_common_status');
    const remove = (field: keyof Filters) => () => {
        setFilters((f) => ({ ...f, [field]: EMPTY_FILTERS[field] }));
        setDraft((d) => ({ ...d, [field]: EMPTY_FILTERS[field] }));
        setPage(1);
    };
    const conditions: SearchCondition[] = [
        ...(filters.keyword.trim()
            ? [{ key: 'keyword', label: '关键字', value: filters.keyword.trim(), onRemove: remove('keyword') }]
            : []),
        ...(filters.status
            ? [
                  {
                      key: 'status',
                      label: '状态',
                      value: statusOptions.find((o) => o.value === filters.status)?.label ?? filters.status,
                      onRemove: remove('status'),
                  },
              ]
            : []),
    ];

    const columns: ColumnProps<RoleView>[] = [
        {
            title: '角色名称',
            dataIndex: 'name',
            width: 150,
            render: (v: string, r: RoleView) => (
                <Space spacing={4}>
                    {v}
                    {r.isBuiltin && (
                        <Tag size="small" color="blue">
                            内置
                        </Tag>
                    )}
                </Space>
            ),
        },
        { title: '角色编码', dataIndex: 'code', width: 140 },
        { title: '描述', dataIndex: 'description', render: (v: string | null) => v || '—' },
        { title: '排序', dataIndex: 'sort', width: 64 },
        { title: '用户数', dataIndex: 'userCount', width: 72 },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: Status) => <StatusTag value={v} /> },
        { title: '创建时间', dataIndex: 'createdAt', width: 164 },
    ];

    const roleActions = (record: RoleView): TableAction[] => [
        { key: 'edit', label: '编辑', permission: 'system:role:update', onClick: () => setEditing(record) },
        { key: 'assign', label: '分配权限', permission: 'system:role:assign-menu', onClick: () => setAssigning(record) },
        {
            key: 'delete',
            label: '删除',
            permission: 'system:role:delete',
            danger: true,
            disabled: record.isBuiltin,
            confirm: {
                title: '确定删除该角色？',
                ...(record.userCount > 0 ? { content: `仍有 ${record.userCount} 个用户绑定该角色` } : {}),
            },
            onClick: () => deleteRole.mutate(record.id, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (hasAnyPermission('system:role:update', 'system:role:assign-menu', 'system:role:delete')) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 190 });
    }

    const { columns: settledColumns, columnSettings } = useColumnSettings('system/roles', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, roleActions);

    return (
        <PageContainer>
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
                leading={
                    <Permission code="system:role:create">
                        <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                            新增角色
                        </Button>
                    </Permission>
                }
            >
                <Input
                    placeholder="角色名称 / 编码"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((d) => ({ ...d, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 200 }}
                />
                <DictSelect
                    dictCode="sys_common_status"
                    placeholder="状态"
                    value={draft.status}
                    onChange={(v) => setDraft((d) => ({ ...d, status: v as Status | undefined }))}
                />
            </SearchToolbar>
            <Table<RoleView>
                {...tableProps}
                rowKey="id"
                columns={tableColumns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{
                    currentPage: page,
                    pageSize,
                    pageSizeOpts,
                    total: data?.total ?? 0,
                    showSizeChanger: true,
                    showTotal: true,
                    onChange: (p, s) => {
                        setPage(p);
                        setPageSize(s);
                    },
                }}
            />
            {editing !== undefined && <RoleFormModal record={editing} onClose={() => setEditing(undefined)} />}
            {assigning && <RoleMenuSheet role={assigning} onClose={() => setAssigning(null)} />}
        </PageContainer>
    );
}
