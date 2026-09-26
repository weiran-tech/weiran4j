import { Button, Input, Popconfirm, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { DepartmentTreeSelect } from '@/components/DepartmentTreeSelect';
import { DictSelect } from '@/components/DictSelect';
import { DictTag } from '@/components/DictTag';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useDeleteUser, useUserList } from '@/hooks/queries/users';
import { usePermission } from '@/hooks/usePermission';
import type { Status, UserQuery, UserView } from '@/types/api';
import { ResetPasswordModal } from './ResetPasswordModal';
import { UserFormModal } from './UserFormModal';

interface Filters {
    keyword: string;
    status: Status | undefined;
    departmentId: number | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', status: undefined, departmentId: undefined };

function toQuery(f: Filters, page: number, pageSize: number): UserQuery {
    return {
        page,
        pageSize,
        ...(f.keyword.trim() ? { keyword: f.keyword.trim() } : {}),
        ...(f.status ? { status: f.status } : {}),
        ...(f.departmentId !== undefined ? { departmentId: f.departmentId } : {}),
    };
}

export default function UsersPage() {
    const { hasAnyPermission } = usePermission();
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    /** undefined = 关闭；null = 新增；对象 = 编辑 */
    const [editing, setEditing] = useState<UserView | null | undefined>(undefined);
    const [resetting, setResetting] = useState<UserView | null>(null);

    const { data, isFetching } = useUserList(toQuery(filters, page, pageSize));
    const deleteUser = useDeleteUser();

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };

    const columns: ColumnProps<UserView>[] = [
        { title: '用户名', dataIndex: 'username', width: 100 },
        { title: '昵称', dataIndex: 'nickname', width: 100 },
        { title: '部门', dataIndex: 'departmentName', width: 100, render: (v: string | null) => v || '—' },
        {
            title: '角色',
            dataIndex: 'roleNames',
            render: (names: string[]) =>
                names?.length
                    ? names.map((n) => (
                          <Tag key={n} size="small" style={{ marginRight: 4 }}>
                              {n}
                          </Tag>
                      ))
                    : '—',
        },
        { title: '手机', dataIndex: 'phone', width: 116, render: (v: string | null) => v || '—' },
        { title: '性别', dataIndex: 'gender', width: 64, render: (v: string | null) => <DictTag dictCode="sys_user_gender" value={v} /> },
        { title: '状态', dataIndex: 'status', width: 72, render: (v: Status) => <StatusTag value={v} /> },
        { title: '最后登录', dataIndex: 'lastLoginAt', width: 164, render: (v: string | null) => v || '—' },
        { title: '创建时间', dataIndex: 'createdAt', width: 164 },
    ];

    if (hasAnyPermission('system:user:update', 'system:user:reset-password', 'system:user:delete')) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            fixed: 'right',
            width: 176,
            render: (_: unknown, record: UserView) => (
                <Space spacing={4}>
                    <Permission code="system:user:update">
                        <Button theme="borderless" size="small" onClick={() => setEditing(record)}>
                            编辑
                        </Button>
                    </Permission>
                    <Permission code="system:user:reset-password">
                        <Button theme="borderless" size="small" onClick={() => setResetting(record)}>
                            重置密码
                        </Button>
                    </Permission>
                    <Permission code="system:user:delete">
                        <Popconfirm
                            title="确定删除该用户？"
                            content={`删除后「${record.username}」将无法登录`}
                            onConfirm={() =>
                                deleteUser.mutate(record.id, { onSuccess: () => Toast.success('已删除') })
                            }
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
                    <Permission code="system:user:create">
                        <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
                            新增用户
                        </Button>
                    </Permission>
                }
            >
                <Input
                    placeholder="用户名 / 昵称 / 手机"
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
                <DepartmentTreeSelect value={draft.departmentId} onChange={(departmentId) => setDraft((d) => ({ ...d, departmentId }))} />
            </SearchToolbar>
            <Table<UserView>
                rowKey="id"
                columns={columns}
                dataSource={data?.list ?? []}
                loading={isFetching}
                scroll={{ x: 1130 }}
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
            {editing !== undefined && <UserFormModal record={editing} onClose={() => setEditing(undefined)} />}
            {resetting && <ResetPasswordModal user={resetting} onClose={() => setResetting(null)} />}
        </PageContainer>
    );
}
