import { Button, Input, Popconfirm, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DictSelect } from '@/components/DictSelect';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useDeleteRole, useRoleList } from '@/hooks/queries/roles';
import { usePermission } from '@/hooks/usePermission';
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
    const [pageSize, setPageSize] = useState(20);
    const [editing, setEditing] = useState<RoleView | null | undefined>(undefined);
    const [assigning, setAssigning] = useState<RoleView | null>(null);

    const { data, isFetching } = useRoleList(toQuery(filters, page, pageSize));
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

    const columns: ColumnProps<RoleView>[] = [
        {
            title: '角色名称',
            dataIndex: 'name',
            width: 160,
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
        { title: '角色编码', dataIndex: 'code', width: 160 },
        { title: '描述', dataIndex: 'description', render: (v: string | null) => v || '—' },
        { title: '排序', dataIndex: 'sort', width: 80 },
        { title: '用户数', dataIndex: 'userCount', width: 80 },
        { title: '状态', dataIndex: 'status', width: 80, render: (v: Status) => <StatusTag value={v} /> },
        { title: '创建时间', dataIndex: 'createdAt', width: 170 },
    ];

    if (hasAnyPermission('system:role:update', 'system:role:assign-menu', 'system:role:delete')) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: 220,
            render: (_: unknown, record: RoleView) => (
                <Space spacing={4}>
                    <Permission code="system:role:update">
                        <Button theme="borderless" size="small" onClick={() => setEditing(record)}>
                            编辑
                        </Button>
                    </Permission>
                    <Permission code="system:role:assign-menu">
                        <Button theme="borderless" size="small" onClick={() => setAssigning(record)}>
                            分配权限
                        </Button>
                    </Permission>
                    <Permission code="system:role:delete">
                        <Popconfirm
                            title="确定删除该角色？"
                            content={record.userCount > 0 ? `仍有 ${record.userCount} 个用户绑定该角色` : undefined}
                            onConfirm={() => deleteRole.mutate(record.id, { onSuccess: () => Toast.success('已删除') })}
                        >
                            <Button theme="borderless" type="danger" size="small" disabled={record.isBuiltin}>
                                删除
                            </Button>
                        </Popconfirm>
                    </Permission>
                </Space>
            ),
        });
    }

    return (
        <PageContainer>
            <SearchToolbar
                onSearch={search}
                onReset={reset}
                actions={
                    <Permission code="system:role:create">
                        <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
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
                rowKey="id"
                columns={columns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: 1100 }}
                pagination={{
                    currentPage: page,
                    pageSize,
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
