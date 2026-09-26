import { Button, Empty, Input, Popconfirm, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { TagProps } from '@douyinfe/semi-ui/lib/es/tag';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { Permission } from '@/components/Permission';
import { SearchToolbar } from '@/components/SearchToolbar';
import { StatusTag } from '@/components/StatusTag';
import { useDeleteDict, useDeleteDictItem, useDictItems, useDictList } from '@/hooks/queries/dicts';
import { usePermission } from '@/hooks/usePermission';
import type { DictItemView, DictView, Status } from '@/types/api';
import { DictFormModal, DictItemFormModal } from './DictFormModals';

/** 右侧：选中字典的字典项 */
function DictItemsPanel({ dict }: { dict: DictView }) {
    const { hasPermission } = usePermission();
    const { data, isFetching } = useDictItems(dict.id);
    const deleteItem = useDeleteDictItem();
    const [editing, setEditing] = useState<DictItemView | null | undefined>(undefined);
    const canEdit = hasPermission('system:dict:update');

    const columns: ColumnProps<DictItemView>[] = [
        {
            title: '标签',
            dataIndex: 'label',
            render: (v: string, r: DictItemView) => (
                <Tag size="small" color={(r.color || 'grey') as TagProps['color']}>
                    {v}
                </Tag>
            ),
        },
        { title: '值', dataIndex: 'value' },
        { title: '排序', dataIndex: 'sort', width: 70 },
        { title: '状态', dataIndex: 'status', width: 80, render: (v: Status) => <StatusTag value={v} /> },
        { title: '备注', dataIndex: 'remark', render: (v: string | null) => v || '—' },
    ];
    if (canEdit) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            width: 130,
            render: (_: unknown, record: DictItemView) => (
                <Space spacing={4}>
                    <Button theme="borderless" size="small" onClick={() => setEditing(record)}>
                        编辑
                    </Button>
                    <Popconfirm
                        title="确定删除该字典项？"
                        onConfirm={() =>
                            deleteItem.mutate({ dictId: dict.id, itemId: record.id }, { onSuccess: () => Toast.success('已删除') })
                        }
                    >
                        <Button theme="borderless" type="danger" size="small">
                            删除
                        </Button>
                    </Popconfirm>
                </Space>
            ),
        });
    }

    return (
        <PageContainer
            title={`字典项：${dict.name}（${dict.code}）`}
            extra={
                canEdit && (
                    <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
                        新增字典项
                    </Button>
                )
            }
        >
            <Table<DictItemView> rowKey="id" columns={columns} dataSource={data ?? []} loading={isFetching} pagination={false} />
            {editing !== undefined && <DictItemFormModal dictId={dict.id} record={editing} onClose={() => setEditing(undefined)} />}
        </PageContainer>
    );
}

export default function DictsPage() {
    const { hasAnyPermission } = usePermission();
    const [draft, setDraft] = useState('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [selected, setSelected] = useState<DictView | null>(null);
    const [editing, setEditing] = useState<DictView | null | undefined>(undefined);
    const { data, isFetching } = useDictList({ page, pageSize, ...(keyword ? { keyword } : {}) });
    const deleteDict = useDeleteDict();

    const search = () => {
        setKeyword(draft.trim());
        setPage(1);
    };

    const columns: ColumnProps<DictView>[] = [
        {
            title: '字典名称',
            dataIndex: 'name',
            render: (v: string, r: DictView) => (
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
        { title: '字典编码', dataIndex: 'code' },
        { title: '状态', dataIndex: 'status', width: 80, render: (v: Status) => <StatusTag value={v} /> },
    ];
    if (hasAnyPermission('system:dict:update', 'system:dict:delete')) {
        columns.push({
            title: '操作',
            dataIndex: 'actions',
            width: 130,
            render: (_: unknown, record: DictView) => (
                // 阻止冒泡：点操作按钮不要顺带选中该行
                <span onClick={(e) => e.stopPropagation()}>
                <Space spacing={4}>
                    <Permission code="system:dict:update">
                        <Button theme="borderless" size="small" onClick={() => setEditing(record)}>
                            编辑
                        </Button>
                    </Permission>
                    <Permission code="system:dict:delete">
                        <Popconfirm
                            title="确定删除该字典？"
                            content="字典项会一并删除"
                            onConfirm={() =>
                                deleteDict.mutate(record.id, {
                                    onSuccess: () => {
                                        Toast.success('已删除');
                                        if (selected?.id === record.id) setSelected(null);
                                    },
                                })
                            }
                        >
                            <Button theme="borderless" type="danger" size="small" disabled={record.isBuiltin}>
                                删除
                            </Button>
                        </Popconfirm>
                    </Permission>
                </Space>
                </span>
            ),
        });
    }

    return (
        <div className="dicts-layout">
            <PageContainer title="字典">
                <SearchToolbar
                    onSearch={search}
                    actions={
                        <Permission code="system:dict:create">
                            <Button type="primary" theme="solid" icon={<Plus size={14} />} onClick={() => setEditing(null)}>
                                新增
                            </Button>
                        </Permission>
                    }
                >
                    <Input placeholder="名称 / 编码" value={draft} onChange={setDraft} onEnterPress={search} showClear style={{ width: 160 }} />
                </SearchToolbar>
                <Table<DictView>
                    rowKey="id"
                    columns={columns}
                    dataSource={data?.list ?? []}
                    loading={isFetching}
                    onRow={(record) => ({
                        onClick: () => record && setSelected(record),
                        style: { cursor: 'pointer' },
                        className: record && selected?.id === record.id ? 'row-selected' : '',
                    })}
                    pagination={{
                        currentPage: page,
                        pageSize,
                        total: data?.total ?? 0,
                        onChange: (p, s) => {
                            setPage(p);
                            setPageSize(s);
                        },
                    }}
                />
            </PageContainer>
            {selected ? (
                <DictItemsPanel key={selected.id} dict={selected} />
            ) : (
                <PageContainer>
                    <Empty title="请选择字典" description="点击左侧字典查看和维护字典项" style={{ padding: 48 }} />
                </PageContainer>
            )}
            {editing !== undefined && <DictFormModal record={editing} onClose={() => setEditing(undefined)} />}
        </div>
    );
}
