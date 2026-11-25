import { Button, Input, Modal, Select, SideSheet, Space, Table, Tag, Toast, Typography } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useChatConvAll, useChatConvList, useSaveChatConv, useStaffAll } from '@/hooks/queries/im';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { ChatConvQuery, ChatConvView, ConvStatus, ConvType } from '@/types/api';
import { formatMoney } from './workbench-utils';
import './im.css';

const TYPE_META: Record<ConvType, { label: string; color: 'blue' | 'purple' }> = {
    presale: { label: '售前', color: 'blue' },
    trade: { label: '交易', color: 'purple' },
};

const STATUS_META: Record<ConvStatus, { label: string; color: 'green' | 'orange' | 'grey' }> = {
    active: { label: '进行中', color: 'green' },
    pending: { label: '待回复', color: 'orange' },
    suspended: { label: '已挂起', color: 'grey' },
    closed: { label: '已关闭', color: 'grey' },
};

interface Filters {
    keyword: string;
    type: ConvType | undefined;
    status: ConvStatus | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', type: undefined, status: undefined };

const TYPE_OPTIONS = [
    { label: '售前', value: 'presale' },
    { label: '交易', value: 'trade' },
];

const STATUS_OPTIONS = [
    { label: '进行中', value: 'active' },
    { label: '待回复', value: 'pending' },
    { label: '已挂起', value: 'suspended' },
    { label: '已关闭', value: 'closed' },
];

function toQuery(filters: Filters, page: number, pageSize: number): ChatConvQuery {
    return {
        page,
        pageSize,
        ...(filters.keyword.trim() ? { keyword: filters.keyword.trim() } : {}),
        ...(filters.type ? { type: filters.type } : {}),
        ...(filters.status ? { status: filters.status } : {}),
    };
}

function TransferModal({ record, onClose }: { record: ChatConvView; onClose: () => void }) {
    const save = useSaveChatConv();
    const { data: staff } = useStaffAll();
    const [assignee, setAssignee] = useState(record.assignee);
    const options = (staff ?? [])
        .filter((item) => item.enabled && item.name !== record.assignee)
        .map((item) => ({ label: `${item.name}（${item.status === 'online' ? '在线' : item.status === 'busy' ? '挂起' : '离线'}）`, value: item.name }));

    const submit = async () => {
        await save.mutateAsync({ id: record.id, body: { assignee } });
        Toast.success(`已转接给 ${assignee}`);
        onClose();
    };

    return (
        <Modal
            visible
            title="转接会话"
            onCancel={onClose}
            onOk={() => void submit().catch(() => undefined)}
            okButtonProps={{ loading: save.isPending, disabled: assignee === record.assignee }}
            maskClosable={false}
        >
            <Typography.Paragraph type="tertiary" size="small">
                当前接待 <b>{record.assignee}</b> · {record.groupId}。转接后新客服可查看全部历史消息，原客服退出会话。
            </Typography.Paragraph>
            <div style={{ marginTop: 12 }}>
                <div className="im-muted" style={{ marginBottom: 6 }}>
                    转接给
                </div>
                <Select value={assignee} optionList={options} style={{ width: '100%' }} onChange={(value) => setAssignee(String(value))} />
            </div>
        </Modal>
    );
}

function ConvDetail({ record, onClose, onTransfer }: { record: ChatConvView; onClose: () => void; onTransfer: () => void }) {
    return (
        <SideSheet
            visible
            title={`会话详情 · ${record.groupId}`}
            width={620}
            onCancel={onClose}
            footer={
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
                    <Button onClick={onClose}>关闭</Button>
                    <Button type="primary" theme="solid" disabled={record.status === 'closed'} onClick={onTransfer}>
                        转接会话
                    </Button>
                </div>
            }
        >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                <section>
                    <div className="im-section__title" style={{ marginBottom: 8 }}>
                        群信息
                    </div>
                    <div className="im-kv">
                        <span className="im-kv__k">群 ID</span>
                        <span>{record.groupId}</span>
                        <span className="im-kv__k">群名称</span>
                        <span>{record.title}</span>
                        <span className="im-kv__k">类型</span>
                        <span>
                            <Tag size="small" color={TYPE_META[record.type].color}>
                                {TYPE_META[record.type].label}
                            </Tag>
                        </span>
                        <span className="im-kv__k">状态</span>
                        <span>
                            <Tag size="small" color={STATUS_META[record.status].color}>
                                {STATUS_META[record.status].label}
                            </Tag>
                        </span>
                        <span className="im-kv__k">接待客服</span>
                        <span>{record.assignee}</span>
                        <span className="im-kv__k">最近消息</span>
                        <span>
                            {record.lastMessage} <span className="im-muted">· {record.lastTime}</span>
                        </span>
                    </div>
                </section>

                <section>
                    <div className="im-section__title" style={{ marginBottom: 8 }}>
                        群成员
                    </div>
                    <div className="im-kv">
                        <span className="im-kv__k">成员</span>
                        <span>
                            <Space wrap spacing={6}>
                                {record.members.map((member) => (
                                    <Tag key={`${member.name}-${member.role}`} size="small" color={member.online ? 'green' : 'grey'}>
                                        {member.role} · {member.name}
                                    </Tag>
                                ))}
                            </Space>
                        </span>
                    </div>
                </section>

                <section>
                    <div className="im-section__title" style={{ marginBottom: 8 }}>
                        客户信息
                    </div>
                    <div className="im-kv">
                        <span className="im-kv__k">买家</span>
                        <span>
                            {record.buyer} {record.buyerOnline ? '· 在线' : '· 离线'}
                        </span>
                        <span className="im-kv__k">用户 ID</span>
                        <span>{record.uid}</span>
                        <span className="im-kv__k">手机号</span>
                        <span>{record.phone}</span>
                        <span className="im-kv__k">注册时间</span>
                        <span>{record.registered}</span>
                        <span className="im-kv__k">来源</span>
                        <span>{record.source}</span>
                        <span className="im-kv__k">历史订单</span>
                        <span>
                            {record.orders} 单 · GMV {formatMoney(record.gmv)}
                        </span>
                    </div>
                </section>

                <section>
                    <div className="im-section__title" style={{ marginBottom: 8 }}>
                        关联订单
                    </div>
                    <div className="im-kv">
                        <span className="im-kv__k">订单号</span>
                        <span>{record.orderId}</span>
                        <span className="im-kv__k">商品</span>
                        <span>{record.orderTitle}</span>
                        <span className="im-kv__k">金额</span>
                        <span>{formatMoney(record.orderPrice)}</span>
                        <span className="im-kv__k">订单状态</span>
                        <span>{record.orderStatus}</span>
                        <span className="im-kv__k">卖家</span>
                        <span>{record.seller}</span>
                    </div>
                </section>
            </div>
        </SideSheet>
    );
}

export default function ChatsPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<ChatConvView | null>(null);
    const [transferTarget, setTransferTarget] = useState<ChatConvView | null>(null);

    const { data, isFetching, refetch } = useChatConvList(toQuery(filters, page, pageSize));
    const { data: all } = useChatConvAll();

    const stats = useMemo(() => {
        const list = all ?? [];
        return {
            total: list.length,
            active: list.filter((item) => item.status !== 'closed').length,
            pending: list.filter((item) => item.status === 'pending').length,
            closed: list.filter((item) => item.status === 'closed').length,
        };
    }, [all]);

    const search = () => {
        setFilters({ ...draft });
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
        ...(filters.type
            ? [{ key: 'type', label: '群类型', value: TYPE_META[filters.type].label, onRemove: removeCondition('type') }]
            : []),
        ...(filters.status
            ? [{ key: 'status', label: '状态', value: STATUS_META[filters.status].label, onRemove: removeCondition('status') }]
            : []),
    ];

    const actionsOf = (record: ChatConvView): TableAction[] => [
        { key: 'view', label: '详情', onClick: () => setDetail(record) },
        { key: 'transfer', label: '转接', disabled: record.status === 'closed', onClick: () => setTransferTarget(record) },
    ];

    const columns: ColumnProps<ChatConvView>[] = [
        { title: '群 ID', dataIndex: 'groupId', width: 120 },
        {
            title: '群名称',
            dataIndex: 'title',
            width: 280,
            render: (value: string, record: ChatConvView) => (
                <div>
                    <div>{value}</div>
                    <div className="im-muted">{record.buyer}</div>
                </div>
            ),
        },
        {
            title: '类型',
            dataIndex: 'type',
            width: 80,
            render: (value: ConvType) => (
                <Tag size="small" color={TYPE_META[value].color}>
                    {TYPE_META[value].label}
                </Tag>
            ),
        },
        {
            title: '成员',
            dataIndex: 'members',
            width: 260,
            render: (_: unknown, record: ChatConvView) => (
                <Space wrap spacing={4}>
                    {record.members.map((member) => (
                        <Tag key={`${member.name}-${member.role}`} size="small">
                            {member.role} · {member.name}
                        </Tag>
                    ))}
                </Space>
            ),
        },
        { title: '接待客服', dataIndex: 'assignee', width: 100 },
        {
            title: '状态',
            dataIndex: 'status',
            width: 90,
            render: (value: ConvStatus) => (
                <Tag size="small" color={STATUS_META[value].color}>
                    {STATUS_META[value].label}
                </Tag>
            ),
        },
        {
            title: '未读',
            dataIndex: 'unread',
            width: 70,
            render: (value: number) => (value ? <Typography.Text type="danger">{value}</Typography.Text> : <span className="im-muted">0</span>),
        },
        {
            title: '最近消息',
            dataIndex: 'lastTime',
            width: 220,
            render: (value: string, record: ChatConvView) => (
                <div>
                    <div className="im-muted">{value}</div>
                    <div className="im-muted" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 200 }}>
                        {record.lastMessage}
                    </div>
                </div>
            ),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 130 },
    ];

    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    return (
        <PageContainer title="会话与群">
            <div className="im-stats">
                <div className="stat-card">
                    <div className="stat-card__value">{stats.total}</div>
                    <div className="stat-card__label">会话总数</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{stats.active}</div>
                    <div className="stat-card__label">进行中会话</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{stats.pending}</div>
                    <div className="stat-card__label">待回复</div>
                </div>
                <div className="stat-card">
                    <div className="stat-card__value">{stats.closed}</div>
                    <div className="stat-card__label">已关闭</div>
                </div>
            </div>
            <SearchToolbar
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
            >
                <Input
                    placeholder="搜索群名称"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 220 }}
                />
                <Select
                    placeholder="群类型"
                    value={draft.type}
                    optionList={TYPE_OPTIONS}
                    onChange={(value) => setDraft((current) => ({ ...current, type: value as ConvType | undefined }))}
                    showClear
                    style={{ width: 130 }}
                />
                <Select
                    placeholder="状态"
                    value={draft.status}
                    optionList={STATUS_OPTIONS}
                    onChange={(value) => setDraft((current) => ({ ...current, status: value as ConvStatus | undefined }))}
                    showClear
                    style={{ width: 130 }}
                />
            </SearchToolbar>
            <Table<ChatConvView>
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
            {detail && (
                <ConvDetail
                    record={detail}
                    onClose={() => setDetail(null)}
                    onTransfer={() => {
                        setTransferTarget(detail);
                        setDetail(null);
                    }}
                />
            )}
            {transferTarget && <TransferModal record={transferTarget} onClose={() => setTransferTarget(null)} />}
        </PageContainer>
    );
}
