import { sitePath } from '@/prototype/catalog';
import { Avatar, Button, Input, Modal, Select, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useColumnSettings } from '@/components/ColumnSettings';
import { useDeleteStaff, useSaveStaff, useStaffAll, useStaffList } from '@/hooks/queries/im';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { StaffQuery, StaffStatus, StaffView } from '@/types/api';
import { StaffFormSheet } from './StaffFormSheet';
import './im.css';

interface Filters {
    keyword: string;
    status: StaffStatus | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', status: undefined };

const STATUS_META: Record<StaffStatus, { label: string; color: 'green' | 'orange' | 'grey' }> = {
    online: { label: '在线', color: 'green' },
    busy: { label: '挂起', color: 'orange' },
    offline: { label: '离线', color: 'grey' },
};

const STATUS_OPTIONS = [
    { label: '在线', value: 'online' },
    { label: '挂起', value: 'busy' },
    { label: '离线', value: 'offline' },
];

function toQuery(filters: Filters, page: number, pageSize: number): StaffQuery {
    return {
        page,
        pageSize,
        ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
        ...(filters.status ? { status: filters.status } : {}),
    };
}

function StaffStatusTag({ value }: { value: StaffStatus }) {
    const meta = STATUS_META[value] ?? STATUS_META.offline;
    return (
        <Tag color={meta.color} size="small">
            {meta.label}
        </Tag>
    );
}

function StaffStatusModal({ record, onClose }: { record: StaffView; onClose: () => void }) {
    const save = useSaveStaff();
    const [status, setStatus] = useState<StaffStatus>(record.status);
    const submit = async () => {
        await save.mutateAsync({ id: record.id, body: { status, load: status === 'online' ? record.load : 0 } });
        Toast.success(`${record.name} 已切换为${STATUS_META[status].label}`);
        onClose();
    };
    return (
        <Modal
            visible
            title="调整客服状态"
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending }}
            maskClosable={false}
        >
            <Typography.Paragraph type="tertiary" size="small">
                当前 <b>{record.name}</b> 的状态为 <b>{STATUS_META[record.status].label}</b>。挂起后不参与自动分流，可被手动转接。
            </Typography.Paragraph>
            <div style={{ marginTop: 12 }}>
                <div className="im-muted" style={{ marginBottom: 6 }}>
                    目标状态
                </div>
                <Select value={status} optionList={STATUS_OPTIONS} style={{ width: '100%' }} onChange={(value) => setStatus(value as StaffStatus)} />
            </div>
        </Modal>
    );
}

export default function StaffPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [editing, setEditing] = useState<StaffView | null | undefined>(undefined);
    const [statusTarget, setStatusTarget] = useState<StaffView | null>(null);

    const { data, isFetching, refetch } = useStaffList(toQuery(filters, page, pageSize));
    const { data: allStaff } = useStaffAll();
    const remove = useDeleteStaff();

    const search = () => {
        setFilters({ keyword: draft.keyword, status: draft.status });
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setPage(1);
    };
    const removeCondition = (field: keyof Filters) => () => {
        setDraft((value) => ({ ...value, [field]: EMPTY_FILTERS[field] }));
        setFilters((value) => ({ ...value, [field]: EMPTY_FILTERS[field] }));
        setPage(1);
    };

    const conditions: SearchCondition[] = [
        ...(filters.keyword.trim()
            ? [{ key: 'keyword', label: '关键字', value: filters.keyword.trim(), onRemove: removeCondition('keyword') }]
            : []),
        ...(filters.status
            ? [
                  {
                      key: 'status',
                      label: '状态',
                      value: STATUS_META[filters.status].label,
                      onRemove: removeCondition('status'),
                  },
              ]
            : []),
    ];

    const stats = useMemo(() => {
        const list = allStaff ?? [];
        const online = list.filter((item) => item.status === 'online');
        const load = list.reduce((sum, item) => sum + item.load, 0);
        const today = list.reduce((sum, item) => sum + item.today, 0);
        return {
            total: list.length,
            online: online.length,
            busy: list.filter((item) => item.status === 'busy').length,
            offline: list.filter((item) => item.status === 'offline').length,
            load,
            today,
        };
    }, [allStaff]);

    const openWorkbench = (record: StaffView) => {
        window.open(sitePath(`/manage/im/workbench?staff=${encodeURIComponent(record.code)}`), '_blank', 'width=1480,height=920');
    };

    const actionsOf = (record: StaffView): TableAction[] => [
        { key: 'workbench', label: '工作台', onClick: () => openWorkbench(record) },
        { key: 'edit', label: '编辑', onClick: () => setEditing(record) },
        { key: 'status', label: '状态', onClick: () => setStatusTarget(record) },
        {
            key: 'delete',
            label: '删除',
            danger: true,
            confirm: { title: '确定删除该客服？', content: `删除后「${record.name}」将不再出现在分组与分流候选中` },
            onClick: () =>
                remove.mutate(record.id, {
                    onSuccess: () => Toast.success('已删除'),
                }),
        },
    ];

    const columns: ColumnProps<StaffView>[] = [
        {
            title: '客服',
            dataIndex: 'name',
            width: 220,
            render: (_: unknown, record: StaffView) => (
                <div className="im-staff-cell">
                    <Avatar size="small" style={{ background: record.color, color: '#33518f', flex: 'none' }}>
                        {record.name.slice(0, 1)}
                    </Avatar>
                    <div>
                        <div className="im-staff-cell__name" style={{ color: 'var(--semi-color-primary)', cursor: 'pointer' }} onClick={() => openWorkbench(record)}>
                            {record.name}
                        </div>
                        <div className="im-staff-cell__code">{record.code}</div>
                    </div>
                </div>
            ),
        },
        { title: '状态', dataIndex: 'status', width: 90, render: (value: StaffStatus) => <StaffStatusTag value={value} /> },
        {
            title: '启用',
            dataIndex: 'enabled',
            width: 80,
            render: (value: boolean) => (
                <Tag color={value ? 'green' : 'grey'} size="small">
                    {value ? '启用' : '停用'}
                </Tag>
            ),
        },
        { title: '当前接待', dataIndex: 'load', width: 110 },
        { title: '今日接待', dataIndex: 'today', width: 110 },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 180 },
    ];

    const { columns: settledColumns, columnSettings } = useColumnSettings('im/staff', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer title="客服列表">
            <div className="im-stats im-stats--3">
                <div className="stat-card">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">
                        客服总数 · 在线 {stats.online} / 挂起 {stats.busy} / 离线 {stats.offline}
                    </div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{stats.load}</div>
                    <div className="stat-card__label">当前接待会话</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{stats.today}</div>
                    <div className="stat-card__label">今日接待</div>
                </div>
            </div>
            <SearchToolbar
                tools={columnSettings}
                leading={
                    <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                        新增客服
                    </Button>
                }
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
            >
                <Input
                    placeholder="搜索客服姓名 / 账号"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 220 }}
                />
                <Select
                    placeholder="状态"
                    value={draft.status}
                    optionList={STATUS_OPTIONS}
                    onChange={(value) => setDraft((current) => ({ ...current, status: value as StaffStatus | undefined }))}
                    showClear
                    style={{ width: 140 }}
                />
            </SearchToolbar>
            <Table<StaffView>
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
                    onChange: (nextPage, nextSize) => {
                        setPage(nextPage);
                        setPageSize(nextSize);
                    },
                }}
            />
            {editing !== undefined && <StaffFormSheet record={editing} onClose={() => setEditing(undefined)} />}
            {statusTarget && <StaffStatusModal record={statusTarget} onClose={() => setStatusTarget(null)} />}
        </PageContainer>
    );
}
