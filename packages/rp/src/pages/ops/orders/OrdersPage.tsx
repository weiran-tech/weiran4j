import { Input, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { useOpsAction, useOpsConfig, useOpsList, useOpsListAll } from '@/hooks/queries/ops';
import type { OpsOrderRow, OpsUserRow } from '@/hooks/queries/ops';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import { OpsLogsSheet, OpsNote, OpsPageTip, OpsStatusTag, OpsTabs, OpsTitle, money } from '../ops';
import { OfflinePayModal } from './OfflinePayModal';
import { ToOfflineModal } from './ToOfflineModal';
import { ManualRebateModal } from '../rebates/RebateDialogs';
import { OrderDetailSheet, OrderGroupSheet, orderLogs } from './OrderSheets';

const TABS = ['全部', '待支付', '已支付', '已发货', '已收货', '已完成', '已关闭', '已取消', '已退款'];

export default function OrdersPage() {
    const [draftKeyword, setDraftKeyword] = useState('');
    const [keyword, setKeyword] = useState('');
    const [status, setStatus] = useState('');
    const [page, setPage] = useState(1);
    const { tableProps, pageSize: defaultPageSize, pageSizeOpts } = useTableDefaults();
    const [pageSize, setPageSize] = useState(defaultPageSize);
    const [detail, setDetail] = useState<OpsOrderRow | null>(null);
    const [rebateOrder, setRebateOrder] = useState<OpsOrderRow | null>(null);
    const [groupOf, setGroupOf] = useState<OpsOrderRow | null>(null);
    const [logsOf, setLogsOf] = useState<OpsOrderRow | null>(null);
    const [payingOf, setPayingOf] = useState<OpsOrderRow | null>(null);
    const [offlineOf, setOfflineOf] = useState<OpsOrderRow | null>(null);

    const { data, isFetching, refetch } = useOpsList<OpsOrderRow>('order', {
        page,
        pageSize,
        keyword: keyword.trim(),
        status,
    });
    const { data: users } = useOpsListAll<OpsUserRow>('user');
    const { data: config } = useOpsConfig();
    const action = useOpsAction('order');

    const search = () => {
        setKeyword(draftKeyword);
        setPage(1);
    };
    const reset = () => {
        setDraftKeyword('');
        setKeyword('');
        setStatus('');
        setPage(1);
    };

    const contact = (row: OpsOrderRow, target: 'buyer' | 'seller') => {
        if (target === 'seller' && !row.sellerUid) {
            Toast.warning('该订单商品为后台来源，无关联卖家');
            return;
        }
        const uid = target === 'buyer' ? row.buyerUid : row.sellerUid;
        const name = users?.find((user) => user.uid === uid)?.nickname ?? uid;
        action.mutate(
            {
                action: 'addLog',
                id: row.id,
                body: {
                    actionName: target === 'buyer' ? '联系买家' : '联系卖家',
                    remark: `已向${target === 'buyer' ? '买家' : '卖家'}发送站内消息`,
                },
            },
            { onSuccess: () => Toast.success(`已向${target === 'buyer' ? '买家' : '卖家'} ${name} 发送站内消息`) },
        );
    };

    const columns: ColumnProps<OpsOrderRow>[] = [
        {
            title: '订单编号',
            dataIndex: 'code',
            width: 170,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '订单类型',
            dataIndex: 'orderType',
            width: 108,
            // 枚举只有「渠道单 / 线下单」两个值，打款进度不挂在这里 —— 看状态列即可
            render: (value: string) => (
                <Tag size="small" color={value === '线下单' ? 'violet' : 'blue'}>{value || '渠道单'}</Tag>
            ),
        },
        {
            title: '商品编号',
            dataIndex: 'goodsCode',
            width: 160,
            render: (value: string) => <span className="ops-mono ops-sub">{value}</span>,
        },
        {
            title: '买方ID',
            dataIndex: 'buyerUid',
            width: 100,
            render: (value: string) => <span className="ops-mono">{value}</span>,
        },
        {
            title: '卖方ID',
            dataIndex: 'sellerUid',
            width: 100,
            render: (value: string) => (value ? <span className="ops-mono">{value}</span> : '—'),
        },
        {
            title: '游戏区服',
            dataIndex: 'game',
            width: 230,
            render: (_: string, row: OpsOrderRow) => (
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
        { title: '状态', dataIndex: 'status', width: 90, render: (value: string) => <OpsStatusTag value={value} /> },
        {
            title: '价格',
            dataIndex: 'price',
            width: 110,
            render: (value: number) => <span className="ops-money">{money(value)}</span>,
        },
        { title: '支付完成时间', dataIndex: 'paidAt', width: 140, render: (value: string) => value || '—' },
        { title: '交易完成时间', dataIndex: 'doneAt', width: 140, render: (value: string) => value || '—' },
        { title: '取消交易时间', dataIndex: 'canceledAt', width: 140, render: (value: string) => value || '—' },
        { title: '申请售后时间', dataIndex: 'afterSaleAt', width: 140, render: (value: string) => value || '—' },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 250 },
    ];

    const actionsOf = (row: OpsOrderRow): TableAction[] => [
        { key: 'detail', label: '详情', onClick: () => setDetail(row) },
        // 线下单的来源一：待支付的渠道单，买家没走渠道支付（例如自己去微信转了），客服把它转成线下
        // 走弹窗而不是二次确认：转单要选收款商户，光点「确定」不知道钱进了哪个账户
        ...(row.orderType !== '线下单' && row.status === '待支付'
            ? [{ key: 'toOffline', label: '转线下单', onClick: () => setOfflineOf(row) }]
            : []),
        // 线下单的来源二：买家已确认收货，该放款给卖家了。打款完成即置为「已完成」
        ...(row.orderType === '线下单' && row.status === '已收货' && row.offlinePay?.state !== 'done'
            ? [{ key: 'offlinePay', label: '登记打款', onClick: () => setPayingOf(row) }]
            : []),
        ...(row.status === '已完成'
            ? [{ key: 'rebate', label: '手动新增返利', onClick: () => setRebateOrder(row) }]
            : []),
        { key: 'buyer', label: '联系买家', onClick: () => contact(row, 'buyer') },
        { key: 'seller', label: '联系卖家', disabled: !row.sellerUid, onClick: () => contact(row, 'seller') },
        { key: 'group', label: '订单群', onClick: () => setGroupOf(row) },
        { key: 'logs', label: '操作记录', onClick: () => setLogsOf(row) },
    ];

    const { columns: settledColumns, columnSettings } = useColumnSettings('ops/orders', columns);
    const { columns: tableColumns } = useActionsColumn(settledColumns, actionsOf);

    return (
        <PageContainer
            title={<OpsTitle name="订单管理" desc="担保交易全流程订单跟踪与售后处理" />}
            extra={<OpsPageTip>换绑超时阈值 2 小时</OpsPageTip>}
        >
            <OpsNote>
                状态流转：<b>待支付 → 已支付 → 已发货 → 已收货 → 已完成</b>；超时未支付置为<b>已关闭</b>，交易中止置为
                <b>已取消</b>，售后赔付完成置为<b>已退款</b>。卖方ID 为空表示该订单商品为后台来源、无关联卖家。
                <br />
                线下单：来源有两种 —— 待支付的渠道单可<b>转线下单</b>（买家未走渠道支付），或本身就是线下单。买家
                <b>确认收货</b>后由运营<b>登记打款</b>放款给卖家，打款登记完成即置为<b>已完成</b>。
                <br />
                资金口径：<b>卖家预计实收 = 订单金额 − 平台服务费</b>（与提现单金额同一个数）；
                <b>买家实付 = 订单金额 + 包赔费</b>（包赔费归平台、平台承担赔付，不进卖家货款）；
                通道费由平台承担，只在详情里列出供对账。
                <br />
                转线下单要选<b>收款商户</b>并登记<b>付款凭证 / 实收金额 / 支付时间</b>（钱是线下打进某一条商户绑定的账户的，
                不记下来退款与对账都答不出「这笔进了谁的户」）；登记打款要选<b>出款账户</b>。
                <b>两处下拉都列全部主体、不按状态过滤</b> —— 线下收付走人工，与账户的线上接口状态无关。
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
                    placeholder="搜索订单编号 / 商品编号 / 买方ID / 游戏账号"
                    value={draftKeyword}
                    onChange={setDraftKeyword}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
            </SearchToolbar>
            <Table<OpsOrderRow>
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
            {offlineOf && <ToOfflineModal row={offlineOf} onClose={() => setOfflineOf(null)} />}
            {payingOf && <OfflinePayModal row={payingOf} onClose={() => setPayingOf(null)} />}
            {detail && <OrderDetailSheet row={detail} users={users ?? []} onClose={() => setDetail(null)} />}
            {rebateOrder && config && (
                <ManualRebateModal
                    users={users ?? []}
                    config={config}
                    order={rebateOrder}
                    onClose={() => setRebateOrder(null)}
                />
            )}
            {groupOf && <OrderGroupSheet row={groupOf} users={users ?? []} onClose={() => setGroupOf(null)} />}
            {logsOf && (
                <OpsLogsSheet
                    visible
                    title={`操作记录 · ${logsOf.code}`}
                    logs={orderLogs(logsOf, users)}
                    onClose={() => setLogsOf(null)}
                />
            )}
        </PageContainer>
    );
}
