import { Button, Dropdown, Empty, Modal, Pagination, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { TagProps } from '@douyinfe/semi-ui/lib/es/tag';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { MoreHorizontal, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { NavListItem, NavListPanel } from '@/components/NavListPanel';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { PageContainer } from '@/components/PageContainer';
import { StatusTag } from '@/components/StatusTag';
import { useDeleteDict, useDeleteDictItem, useDictItems, useDictList } from '@/hooks/queries/dicts';
import { usePermission } from '@/hooks/usePermission';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { DictItemView, DictView, Status } from '@/types/api';
import { DictFormModal, DictItemFormModal } from './DictFormModals';

/** 右侧：选中字典的字典项 */
function DictItemsPanel({ dict }: { dict: DictView }) {
    const { tableProps } = useTableDefaults();
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
    const itemActions = (record: DictItemView): TableAction[] => [
        { key: 'edit', label: '编辑', onClick: () => setEditing(record) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: { title: '确定删除该字典项？' },
            onClick: () => deleteItem.mutate({ dictId: dict.id, itemId: record.id }, { onSuccess: () => Toast.success('已删除') }),
        },
    ];
    if (canEdit) {
        columns.push({ title: '操作', dataIndex: 'actions', fixed: 'right', width: 130 });
    }
    // 右栏较窄：放不下时操作列收成「更多」
    const { ref: tableBoxRef, columns: tableColumns } = useActionsColumn(columns, itemActions);

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
            <div ref={tableBoxRef}>
                <Table<DictItemView>
                    {...tableProps}
                    rowKey="id"
                    columns={tableColumns}
                    // 设了 scroll.x 固定的「操作」列才生效（右栏窄时可横向滚动）
                    scroll={{ x: tableScrollX(tableColumns) }}
                    dataSource={data ?? []}
                    loading={isFetching}
                    pagination={false}
                />
            </div>
            {editing !== undefined && <DictItemFormModal dictId={dict.id} record={editing} onClose={() => setEditing(undefined)} />}
        </PageContainer>
    );
}

export default function DictsPage() {
    const { hasPermission } = usePermission();
    const [draft, setDraft] = useState('');
    const [keyword, setKeyword] = useState('');
    const [page, setPage] = useState(1);
    const { pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [selectedId, setSelectedId] = useState<number | null>(null);
    const [editing, setEditing] = useState<DictView | null | undefined>(undefined);
    const { data, isFetching, refetch } = useDictList({ page, pageSize, ...(keyword ? { keyword } : {}) });
    const deleteDict = useDeleteDict();
    const canUpdate = hasPermission('system:dict:update');
    const canDelete = hasPermission('system:dict:delete');

    const dicts = data?.list ?? [];
    // 选中项跟随列表：删掉 / 翻页 / 搜索后原选中不在当前页时回落到第一项（同 mono4ts，渲染期推导，不另存副本）
    const selected = dicts.find((d) => d.id === selectedId) ?? dicts[0] ?? null;

    const search = () => {
        setKeyword(draft.trim());
        setPage(1);
    };

    const confirmDelete = (dict: DictView) => {
        Modal.confirm({
            title: `确定删除字典「${dict.name}」？`,
            content: '字典项会一并删除',
            okText: '删除',
            cancelText: '取消',
            okButtonProps: { type: 'danger', theme: 'solid' },
            onOk: () => deleteDict.mutateAsync(dict.id).then(() => Toast.success('已删除')),
        });
    };

    const renderDict = (dict: DictView) => (
        <NavListItem
            key={dict.id}
            active={selected?.id === dict.id}
            onClick={() => setSelectedId(dict.id)}
            primary={dict.name}
            secondary={dict.code}
            meta={
                <>
                    <span>{dict.createdAt}</span>
                    {dict.isBuiltin && (
                        <Tag size="small" color="blue">
                            内置
                        </Tag>
                    )}
                    {dict.status === 'disabled' && (
                        <Tag size="small" color="grey">
                            停用
                        </Tag>
                    )}
                </>
            }
            {...(dict.status === 'disabled' ? { className: 'nav-list-item--disabled' } : {})}
            {...((canUpdate || canDelete) && {
                extra: (
                    <Dropdown
                        trigger="click"
                        position="bottomRight"
                        clickToHide
                        render={
                            <Dropdown.Menu>
                                {canUpdate && (
                                    <Dropdown.Item icon={<Pencil size={14} />} onClick={() => setEditing(dict)}>
                                        编辑
                                    </Dropdown.Item>
                                )}
                                {canDelete && (
                                    <Dropdown.Item
                                        type="danger"
                                        icon={<Trash2 size={14} />}
                                        disabled={dict.isBuiltin}
                                        onClick={() => confirmDelete(dict)}
                                    >
                                        {dict.isBuiltin ? '内置字典不可删除' : '删除'}
                                    </Dropdown.Item>
                                )}
                            </Dropdown.Menu>
                        }
                    >
                        <Button theme="borderless" size="small" aria-label={`${dict.name}的操作`} icon={<MoreHorizontal size={14} />} />
                    </Dropdown>
                ),
            })}
        />
    );

    return (
        <div className="dicts-layout">
            <div className="dicts-layout__master">
                <NavListPanel
                    title="字典列表"
                    headerExtra={
                        <Dropdown
                            trigger="click"
                            position="bottomRight"
                            clickToHide
                            render={
                                <Dropdown.Menu>
                                    <Dropdown.Item icon={<RefreshCw size={14} />} onClick={() => void refetch()}>
                                        刷新
                                    </Dropdown.Item>
                                    {hasPermission('system:dict:create') && (
                                        <Dropdown.Item icon={<Plus size={14} />} onClick={() => setEditing(null)}>
                                            新增字典
                                        </Dropdown.Item>
                                    )}
                                </Dropdown.Menu>
                            }
                        >
                            <Button theme="borderless" size="small" aria-label="字典列表操作" icon={<MoreHorizontal size={14} />} />
                        </Dropdown>
                    }
                    search={{ value: draft, onChange: setDraft, placeholder: '名称 / 编码', onEnterPress: search }}
                    loading={isFetching}
                    emptyText={keyword ? '没有匹配的字典' : '暂无字典'}
                    footer={
                        <Pagination
                            size="small"
                            total={data?.total ?? 0}
                            currentPage={page}
                            pageSize={pageSize}
                            pageSizeOpts={pageSizeOpts}
                            showSizeChanger
                            onPageChange={setPage}
                            onPageSizeChange={(s) => {
                                setPage(1);
                                setPageSize(s);
                            }}
                        />
                    }
                    dataSource={dicts}
                    renderItem={renderDict}
                />
            </div>
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
