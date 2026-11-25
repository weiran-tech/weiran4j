import { Input, Select, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useOpsAction, useOpsConfig, useOpsList, useOpsListAll } from '@/hooks/queries/ops';
import type { OpsOrderRow, OpsRebateRow, OpsUserRow } from '@/hooks/queries/ops';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import {
    OpsNote,
    OpsPageTip,
    OpsPlainTag,
    OpsStatusTag,
    OpsTabs,
    OpsTitle,
    OpsUserCell,
    levelText,
    money,
    rebateBase,
    rebateCalcText,
} from '../ops';
import { RebateAmountModal } from './RebateDialogs';
import { RebateDetailSheet } from './RebateSheets';

interface Filters {
    keyword: string;
    category: string | undefined;
    origin: string | undefined;
}

const EMPTY_FILTERS: Filters = { keyword: '', category: undefined, origin: undefined };

const TABS = ['全部', '待审核', '已返利'];

export default function RebatesPage() {
    const navigate = useNavigate();
    const [draft, setDraft] = useState<Filters>(EMPTY_FILTERS);
    const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<OpsRebateRow | null>(null);
    const [adjusting, setAdjusting] = useState<OpsRebateRow | null>(null);

    const { data, isFetching, refetch } = useOpsList<OpsRebateRow>('rebate', {
        page,
        pageSize,
        keyword: filters.keyword.trim(),
        status,
        category: filters.category,
        origin: filters.origin,
    });
    const { data: users = [] } = useOpsListAll<OpsUserRow>('user');
    const { data: orders = [] } = useOpsListAll<OpsOrderRow>('order');
    const { data: config } = useOpsConfig();
    const action = useOpsAction('rebate');

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

    const pass = (row: OpsRebateRow) => {
        action.mutate(
            {
                action: 'pass',
                id: row.id,
                body: { remark: `审核通过，返利 ${money(row.amount)} 已计入用户 ${row.inviterUid} 钱包` },
            },
            {
                onSuccess: () => {
                    setDetail(null);
                    Toast.success(`已确认返利 ${money(row.amount)}，计入用户 ${row.inviterUid} 钱包`);
                },
            },
        );
    };

    const viewOrder = (row: OpsRebateRow) => {
        setDetail(null);
        void navigate('/manage/ops-goods/orders');
        Toast.success(`已跳转订单管理，订单编号 ${row.orderCode}`);
    };

    const columns: ColumnProps<OpsRebateRow>[] = [
        {
            title: '返利单号',
            dataIndex: 'code',
            width: 160,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '订单编号',
            dataIndex: 'orderCode',
            width: 160,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '买家',
            dataIndex: 'buyerUid',
            width: 130,
            render: (value: string) => <OpsUserCell uid={value} users={users} />,
        },
        {
            title: '返利对象',
            dataIndex: 'inviterUid',
            width: 150,
            render: (value: string) => <OpsUserCell uid={value} users={users} />,
        },
        {
            title: '类目',
            dataIndex: 'category',
            width: 80,
            render: (value: string) => <OpsPlainTag value={value} brand={value === '账号'} />,
        },
        {
            title: '等级',
            dataIndex: 'level',
            width: 130,
            render: (value: string) => (
                <span className={value ? undefined : 'ops-sub'}>{levelText(config?.levels, value)}</span>
            ),
        },
        {
            title: '返利来源',
            dataIndex: 'origin',
            width: 110,
            render: (value: string, row: OpsRebateRow) => (
                <div className="ops-cell2">
                    <OpsPlainTag value={value} brand={value === '专属'} />
                    {row.origin === '补发' && row.supplementName && (
                        <span className="ops-cell2__sub">{row.supplementName}</span>
                    )}
                    {row.origin === '手动' && <span className="ops-cell2__sub">客服录入</span>}
                </div>
            ),
        },
        {
            title: '返利规则',
            dataIndex: 'mode',
            width: 170,
            render: (_: unknown, row: OpsRebateRow) =>
                row.origin === '手动' || row.origin === '补发' ? (
                    <span className="ops-sub">手动指定金额</span>
                ) : (
                    <span className="ops-sub">{rebateCalcText(row.mode, row.rate, row.amount)}</span>
                ),
        },
        {
            title: '返利金额',
            dataIndex: 'amount',
            width: 140,
            render: (value: number, row: OpsRebateRow) => {
                const base = rebateBase(row);
                return (
                    <div className="ops-cell2">
                        <span className="ops-money">{money(value)}</span>
                        {row.mode === 'rate' && Math.abs(base - value) > 0.001 && (
                            <span className="ops-cell2__sub">原算 {money(base)}</span>
                        )}
                    </div>
                );
            },
        },
        {
            title: '订单利润',
            dataIndex: 'profit',
            width: 110,
            render: (value: number) => <span className="ops-money ops-sub">{money(value)}</span>,
        },
        { title: '状态', dataIndex: 'status', width: 100, render: (value: string) => <OpsStatusTag value={value} /> },
        {
            title: '生成时间',
            dataIndex: 'createdAt',
            width: 140,
            render: (value: string) => <span className="ops-sub">{value}</span>,
        },
        {
            title: '返利时间',
            dataIndex: 'paidAt',
            width: 140,
            render: (value: string) => (value ? <span className="ops-sub">{value}</span> : <span className="ops-sub">—</span>),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 240 },
    ];

    const actionsOf = (row: OpsRebateRow): TableAction[] => {
        const items: TableAction[] = [];
        if (row.status === '待审核') {
            items.push(
                { key: 'edit', label: '修改金额', onClick: () => setAdjusting(row) },
                { key: 'pass', label: '确认返利', onClick: () => pass(row) },
            );
        }
        items.push({ key: 'detail', label: '查看详情', onClick: () => setDetail(row) });
        return items;
    };

    const { columns: settledColumns, columnSettings } = useColumnSettings('ops/rebates', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer
            title={<OpsTitle name="返利明细" desc="返利单审核与返利金额调整" />}
            extra={<OpsPageTip>审核确认后才进入用户钱包</OpsPageTip>}
        >
            <OpsNote>
                返利单在买家<b>确认收货</b>满设定小时数后按<b>等级 × 类目</b>规则生成；订单利润低于
                <b>利润门槛</b>不生成返利。审核模式下返利单先进入<b>待审核</b>，此时可直接修改返利金额，
                <b>确认返利</b>后才计入用户钱包。无等级用户、忘记填推荐码、返利偏少需补差的订单，均可在
                <b>手动新增返利</b>中录入（订单管理 → 已完成订单 → 手动新增返利），同一订单支持多次新增不同返利对象与金额。
            </OpsNote>
            <OpsTabs
                options={TABS}
                value={status}
                counts={data?.counts ?? {}}
                onChange={(value) => {
                    setStatus(value);
                    setPage(1);
                }}
            />
            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
            >
                <Input
                    placeholder="搜索返利单号 / 订单号 / 买家ID / 返利对象"
                    value={draft.keyword}
                    onChange={(keyword) => setDraft((value) => ({ ...value, keyword }))}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
                <Select
                    placeholder="返利类目"
                    value={draft.category}
                    onChange={(value) => setDraft((value2) => ({ ...value2, category: value ? String(value) : undefined }))}
                    optionList={[
                        { label: '账号', value: '账号' },
                        { label: '道具', value: '道具' },
                    ]}
                    showClear
                    style={{ width: 120 }}
                />
                <Select
                    placeholder="返利来源"
                    value={draft.origin}
                    onChange={(value) => setDraft((value2) => ({ ...value2, origin: value ? String(value) : undefined }))}
                    optionList={[
                        { label: '等级', value: '等级' },
                        { label: '专属', value: '专属' },
                        { label: '手动', value: '手动' },
                        { label: '补发', value: '补发' },
                    ]}
                    showClear
                    style={{ width: 120 }}
                />
            </SearchToolbar>
            <Table<OpsRebateRow>
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
            {detail && (
                <RebateDetailSheet
                    row={detail}
                    users={users}
                    orders={orders}
                    config={config}
                    onAdjust={() => {
                        setDetail(null);
                        setAdjusting(detail);
                    }}
                    onPass={() => pass(detail)}
                    onViewOrder={() => viewOrder(detail)}
                    onClose={() => setDetail(null)}
                />
            )}
            {adjusting && <RebateAmountModal row={adjusting} onClose={() => setAdjusting(null)} />}
        </PageContainer>
    );
}
