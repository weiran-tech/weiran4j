import { Input, Select, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useOpsAction, useOpsList, useOpsListAll } from '@/hooks/queries/ops';
import type { OpsGoodsRow, OpsUserRow } from '@/hooks/queries/ops';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import { OpsLogsSheet, OpsNote, OpsPageTip, OpsPlainTag, OpsStatusTag, OpsTabs, OpsTitle, money } from '../ops';
import { GoodsDetailSheet, goodsLogs } from './GoodsDetailSheet';
import { GoodsEditModal, GoodsPayModal, GoodsSellerModal } from './GoodsDialogs';

const TABS = ['全部', '已上架', '已下架', '已售出', '已删除'];

interface Filters {
    keyword: string;
    source: string | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', source: undefined };

export default function GoodsPage() {
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<OpsGoodsRow | null>(null);
    const [editing, setEditing] = useState<OpsGoodsRow | null>(null);
    const [paying, setPaying] = useState<OpsGoodsRow | null>(null);
    const [binding, setBinding] = useState<OpsGoodsRow | null>(null);
    const [logsOf, setLogsOf] = useState<OpsGoodsRow | null>(null);

    const { data, isFetching, refetch } = useOpsList<OpsGoodsRow>('goods', {
        page,
        pageSize,
        keyword: filters.keyword.trim(),
        status,
        source: filters.source,
    });
    const { data: users } = useOpsListAll<OpsUserRow>('user');
    const action = useOpsAction('goods');

    const search = () => {
        setFilters(draft);
        setPage(1);
    };
    const reset = () => {
        setDraft(EMPTY_FILTERS);
        setFilters(EMPTY_FILTERS);
        setStatus('');
        setPage(1);
    };
    const setTab = (value: string) => {
        setStatus(value);
        setPage(1);
    };

    const changeStatus = (row: OpsGoodsRow, next: string, logAction: string, remark: string, tip: string) => {
        action.mutate(
            { action: 'setStatus', id: row.id, body: { status: next, logAction, remark } },
            { onSuccess: () => Toast.success(tip) },
        );
    };

    const contactSeller = (row: OpsGoodsRow) => {
        if (!row.userId) {
            Toast.warning('该商品为后台来源，无关联卖家');
            return;
        }
        const seller = users?.find((user) => user.uid === row.userId);
        action.mutate(
            { action: 'addLog', id: row.id, body: { actionName: '联系卖家', remark: '已向卖家发送站内消息' } },
            { onSuccess: () => Toast.success(`已向卖家 ${seller?.nickname ?? row.userId} 发送站内消息`) },
        );
    };

    const columns: ColumnProps<OpsGoodsRow>[] = [
        {
            title: '商品编号',
            dataIndex: 'code',
            width: 160,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '氪金联盟编号',
            dataIndex: 'unionId',
            width: 150,
            render: (value: string) => (value ? <span className="ops-mono">{value}</span> : '—'),
        },
        {
            title: '商品标题',
            dataIndex: 'title',
            width: 230,
            render: (value: string) => (
                <span className="ops-ellipsis" title={value}>
                    {value}
                </span>
            ),
        },
        {
            title: '用户ID',
            dataIndex: 'userId',
            width: 100,
            render: (value: string) => (value ? <span className="ops-mono">{value}</span> : '—'),
        },
        {
            title: '游戏区服',
            dataIndex: 'game',
            width: 230,
            render: (_: string, row: OpsGoodsRow) => (
                <span className="ops-sub">
                    {row.game} / {row.channel} / {row.region} / {row.server}
                </span>
            ),
        },
        {
            title: '游戏账号',
            dataIndex: 'account',
            width: 150,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <OpsStatusTag value={value} /> },
        {
            title: '来源',
            dataIndex: 'source',
            width: 80,
            render: (value: string) => <OpsPlainTag value={value} brand={value === '用户'} />,
        },
        {
            title: '售价',
            dataIndex: 'price',
            width: 110,
            render: (value: number) => <span className="ops-money">{money(value)}</span>,
        },
        { title: '创建时间', dataIndex: 'createdAt', width: 140, render: (value: string) => value || '—' },
        { title: '上架时间', dataIndex: 'onAt', width: 140, render: (value: string) => value || '—' },
        { title: '下架时间', dataIndex: 'offAt', width: 140, render: (value: string) => value || '—' },
        { title: '删除时间', dataIndex: 'deletedAt', width: 140, render: (value: string) => value || '—' },
        { title: '售出时间', dataIndex: 'soldAt', width: 140, render: (value: string) => value || '—' },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 260 },
    ];

    const actionsOf = (row: OpsGoodsRow): TableAction[] => {
        const items: TableAction[] = [{ key: 'detail', label: '详情', onClick: () => setDetail(row) }];
        if (row.status === '已上架' || row.status === '已下架') {
            items.push({ key: 'edit', label: '编辑', onClick: () => setEditing(row) });
        }
        if (row.status === '已上架') {
            items.push(
                { key: 'pay', label: '支付', onClick: () => setPaying(row) },
                {
                    key: 'off',
                    label: '下架',
                    onClick: () => changeStatus(row, '已下架', '商品下架', '后台手动下架', '商品已下架'),
                },
            );
        }
        if (row.status === '已下架') {
            items.push(
                {
                    key: 'on',
                    label: '上架',
                    onClick: () => changeStatus(row, '已上架', '商品上架', '后台手动上架', '商品已上架'),
                },
                {
                    key: 'del',
                    label: '删除',
                    danger: true,
                    confirm: { title: '确定删除该商品？', content: '软删除，保留操作记录' },
                    onClick: () => changeStatus(row, '已删除', '商品删除', '软删除，保留操作记录', '商品已删除'),
                },
            );
        }
        if (row.status === '已上架' || row.status === '已下架' || row.status === '已售出') {
            if (row.userId) items.push({ key: 'contact', label: '联系卖家', onClick: () => contactSeller(row) });
            else items.push({ key: 'seller', label: '设置卖家', onClick: () => setBinding(row) });
            items.push({ key: 'logs', label: '操作记录', onClick: () => setLogsOf(row) });
        }
        return items;
    };

    const { columns: settledColumns, columnSettings } = useColumnSettings('ops/goods', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer
            title={<OpsTitle name="商品管理" desc="账号商品的来源、上架与生命周期管理" />}
            extra={<OpsPageTip>售价上限 ¥99,999,999</OpsPageTip>}
        >
            <OpsNote>
                状态流转：<b>已上架 ⇄ 已下架</b>，已下架可<b>删除</b>（软删除、保留操作记录）；成交后自动置为<b>已售出</b>。
                后台来源商品无关联卖家、用户ID 可手动编辑。
            </OpsNote>
            <OpsTabs options={TABS} value={status} counts={data?.counts ?? {}} onChange={setTab} />
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
            >
                <Input
                    placeholder="搜索商品编号 / 商品标题 / 游戏账号 / 用户ID"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
                <Select
                    placeholder="来源"
                    value={draft.source}
                    onChange={(value) => setDraft((draftValue) => ({ ...draftValue, source: value ? String(value) : undefined }))}
                    optionList={[
                        { label: '用户', value: '用户' },
                        { label: '后台', value: '后台' },
                    ]}
                    showClear
                    style={{ width: 120 }}
                />
            </SearchToolbar>
            <Table<OpsGoodsRow>
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
                    onChange: (current, size) => {
                        setPage(current);
                        setPageSize(size);
                    },
                }}
            />
            {detail && <GoodsDetailSheet row={detail} users={users ?? []} onClose={() => setDetail(null)} />}
            {logsOf && (
                <OpsLogsSheet
                    visible
                    title={`操作记录 · ${logsOf.code}`}
                    logs={goodsLogs(logsOf, users)}
                    onClose={() => setLogsOf(null)}
                />
            )}
            {editing && <GoodsEditModal row={editing} users={users ?? []} onClose={() => setEditing(null)} />}
            {paying && <GoodsPayModal row={paying} users={users ?? []} onClose={() => setPaying(null)} />}
            {binding && <GoodsSellerModal row={binding} users={users ?? []} onClose={() => setBinding(null)} />}
        </PageContainer>
    );
}
