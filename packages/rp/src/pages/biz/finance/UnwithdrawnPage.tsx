import { Button, Input, Select, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn } from '@/components/TableActions';
import { daysSince, feeOf, money, money0, platFeeOf } from '@/biz/biz-dict';
import { useBizRows, useTradeRule } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizOrderView, BizTradeRuleView, BizWithdrawalView } from '@/types/biz';
import { useCreateExport } from '../export-job';
import { BizStatus, BizTabs, Cell, KpiRow, Money, StatRules } from '../shared';
import { OrderDetailDrawer } from '../orders/OrdersModals';

type AgeBucket = 'all' | 'new' | '3d' | '7d';

interface Row {
    o: BizOrderView;
    ch: 'channel' | 'offline';
    days: number | null;
    amt: number;
    fee: number;
    /** 包赔费：向买家收、归平台，只在这里列出来对账，**不进卖家货款** */
    guar: number;
    net: number;
}

const bucketOf = (d: number | null): AgeBucket => (d === null ? 'all' : d >= 7 ? '7d' : d >= 3 ? '3d' : 'new');

export default function UnwithdrawnPage() {
    const [age, setAge] = useState<AgeBucket>('all');
    const [chFilter, setChFilter] = useState('all');
    const [draftQ, setDraftQ] = useState('');
    const [q, setQ] = useState('');
    const [detail, setDetail] = useState<BizOrderView | null>(null);
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data: orders = [], isFetching, refetch } = useBizRows<BizOrderView>('bizOrder');
    const { data: withdrawals = [] } = useBizRows<BizWithdrawalView>('bizWithdrawal');
    const { data: rule } = useTradeRule<BizTradeRuleView>();
    const createExport = useCreateExport();
    const feePct = rule?.trade.feePct ?? 10;

    /**
     * 进这一页只有两个条件：交易完成 + 该出的款还没出。
     * 渠道单看提现单（没有单或仍是 wait）；线下单看打款登记（state ≠ done）。
     */
    const all = useMemo<Row[]>(() => {
        return orders
            .filter((o) => o.state === 'trade_done' && o.sellerId)
            .map((o) => {
                const w = withdrawals.find((x) => x.orderCode === o.code);
                const isOff = o.ch === 'offline';
                const paidDone = o.offlinePay?.state === 'done';
                const stillThere = isOff ? !paidDone : !w || w.state === 'wait';
                if (!stillThere) return null;
                const fee = platFeeOf(o.amt, feePct);
                /* 应提货款 = 订单金额 − 交易手续费（**只扣这一项**），与提现单金额同口径。
                   包赔费向**买家**收、归平台，不进卖家货款；通道费由平台承担 ——
                   两项都不该从这个算式里减掉（2026-11-17 业务定）。 */
                const guar = feeOf(o.amt, rule?.guar);
                return {
                    o,
                    ch: isOff ? ('offline' as const) : ('channel' as const),
                    days: daysSince(o.confirmedAt || o.createdAt),
                    amt: o.amt,
                    fee,
                    guar,
                    net: +(o.amt - fee).toFixed(2),
                };
            })
            .filter((x): x is Row => x !== null);
    }, [orders, withdrawals, feePct, rule?.guar]);

    const pool = all
        .filter((x) => (age === 'all' ? true : bucketOf(x.days) === age))
        .filter((x) => (chFilter === 'all' ? true : x.ch === chFilter))
        .filter((x) => {
            if (!q) return true;
            return `${x.o.code} ${x.o.item} ${x.o.seller}`.toLowerCase().includes(q.toLowerCase());
        })
        .slice()
        .sort((a, b) => (b.days ?? -1) - (a.days ?? -1));

    const sum = (arr: Row[]) => +arr.reduce((s, x) => s + x.net, 0).toFixed(2);
    const chN = all.filter((x) => x.ch === 'channel').length;
    const offN = all.length - chN;
    const offList = all.filter((x) => x.ch === 'offline');
    const oldList = all.filter((x) => bucketOf(x.days) === '7d');

    const search = () => setQ(draftQ.trim());
    const reset = () => {
        setDraftQ('');
        setQ('');
        setAge('all');
        setChFilter('all');
    };

    const conditions: SearchCondition[] = q
        ? [{ key: 'q', label: '关键字', value: q, onRemove: () => { setQ(''); setDraftQ(''); } }]
        : [];

    const columns: ColumnProps<Row>[] = [
        {
            title: '订单号',
            dataIndex: 'code',
            width: 124,
            render: (_: unknown, x) => <span className="biz-mono">{x.o.code}</span>,
        },
        {
            title: '类型 / 待谁动',
            dataIndex: 'ch',
            width: 128,
            render: (_: unknown, x) => (
                <Cell
                    main={
                        <BizStatus
                            dict={{ offline: { t: '线下单', tone: 'violet' }, channel: { t: '渠道单', tone: 'brand' } }}
                            value={x.ch}
                        />
                    }
                    sub={x.ch === 'offline' ? '待客服登记打款' : '待卖家发起'}
                    subDanger={x.ch === 'offline'}
                />
            ),
        },
        {
            title: '商品',
            dataIndex: 'item',
            width: 226,
            render: (_: unknown, x) => (
                <span className="biz-cell__sub" title={x.o.item} style={{ maxWidth: 220 }}>
                    {x.o.item}
                </span>
            ),
        },
        {
            title: '卖家',
            dataIndex: 'seller',
            width: 140,
            render: (_: unknown, x) => (
                <span className="biz-cell__sub" title={x.o.seller} style={{ maxWidth: 134 }}>
                    {x.o.seller}
                </span>
            ),
        },
        { title: '订单金额', dataIndex: 'amt', width: 108, align: 'right', render: (_: unknown, x) => <Money value={x.amt} /> },
        {
            title: '交易手续费',
            dataIndex: 'fee',
            width: 108,
            align: 'right',
            render: (_: unknown, x) => (
                <span className="biz-num biz-dim">− {money(x.fee)}</span>
            ),
        },
        {
            title: '应提货款',
            dataIndex: 'net',
            width: 110,
            align: 'right',
            render: (_: unknown, x) => (
                <span className="biz-num" style={{ fontWeight: 650 }}>
                    ¥ {money(x.net)}
                </span>
            ),
        },
        {
            title: '交易完成',
            dataIndex: 'confirmedAt',
            width: 120,
            render: (_: unknown, x) => {
                const v = x.o.confirmedAt || x.o.createdAt;
                return v ? <span className="biz-mono">{v.slice(5)}</span> : <span className="biz-dim">—</span>;
            },
        },
        {
            title: '已停留',
            dataIndex: 'days',
            width: 84,
            render: (_: unknown, x) => {
                if (x.days === null) return <span className="biz-dim">—</span>;
                const tone = x.days >= 7 ? 'biz-danger' : x.days >= 3 ? 'biz-warn' : '';
                return (
                    <span className={`biz-num ${tone}`} style={x.days >= 7 ? { fontWeight: 700 } : undefined}>
                        {x.days} 天
                    </span>
                );
            },
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 88 },
    ];

    const actionsOf = (x: Row) => [{ key: 'order', label: '看订单', onClick: () => setDetail(x.o) }];
    const { columns: settled, columnSettings } = useColumnSettings('biz/unwithdrawn', columns);
    const { columns: tableColumns } = useActionsColumn(settled, actionsOf);

    const exportNow = () => {
        const code = createExport({
            kind: 'unwithdrawn',
            menu: '未提现订单',
            filter: `${age === 'all' ? '全部' : bucketOfLabel(age)}${chFilter !== 'all' ? ` · ${chFilter === 'offline' ? '线下单' : '渠道单'}` : ''}`,
            rows: pool.length,
        });
        Toast.success(`已提交导出任务 ${code}`);
    };

    return (
        <PageContainer title="未提现订单" extra={<Button onClick={exportNow}>导出</Button>}>
            <KpiRow
                items={[
                    { label: '未提现订单', value: all.length, unit: '笔', desc: `渠道 ${chN} 笔 · 线下 ${offN} 笔` },
                    { label: '未提现金额', value: `¥ ${money0(sum(all))}`, desc: '应提货款（订单金额 − 交易手续费）' },
                    { label: '等客服打款', value: offN, unit: '笔', desc: `¥ ${money(sum(offList))} · 线下单，我们自己的待办` },
                    { label: '超过 7 天没动', value: oldList.length, unit: '笔', alert: oldList.length > 0, desc: `¥ ${money(sum(oldList))} · 这些该有人问一句` },
                ]}
            />
            <StatRules
                items={[
                    '<b>进这一页只有两个条件：交易完成 + 该出的款还没出。</b>未支付 / 已支付未确认 / 已退款 / 已关闭一律不算。',
                    '<b>渠道单「还没提」= 没有提现单，或提现单还是「待提现」。</b>',
                    '<b>线下单「还没打款」= 打款登记未完成。</b>线下单永远不会有提现单，判据只能是「登记打款做完了没有」。',
                    '<b>金额 = 订单金额 − 交易手续费</b>，这是应提货款，不是买家实付。',
                    '<b>不含失败 / 异常 / 在办</b>：那三种同样没到卖家手里，但已经有单据、处置在提现管理。',
                    '<b>「已停留」按真实今天算，不按样例基准日</b>，否则所有单都会显示 0 天。',
                ]}
            />

            <BizTabs
                items={[
                    { key: 'all', label: '全部', count: all.length },
                    { key: 'new', label: '3 天内', count: all.filter((x) => bucketOf(x.days) === 'new').length },
                    { key: '3d', label: '3–6 天', count: all.filter((x) => bucketOf(x.days) === '3d').length },
                    { key: '7d', label: '7 天以上', count: oldList.length },
                ].filter((t) => t.key === 'all' || t.count > 0)}
                value={age}
                onChange={(k) => setAge(k as AgeBucket)}
                hint={`共 ${pool.length} / ${all.length} 笔`}
            />

            <SearchToolbar
                tools={columnSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void refetch()}
                refreshing={isFetching}
                conditions={conditions}
                advanced={
                    <>
                        <SearchField label="类型">
                            <Select
                                value={chFilter}
                                onChange={(v) => setChFilter(String(v))}
                                style={{ width: '100%' }}
                                optionList={[
                                    { label: '全部类型', value: 'all' },
                                    { label: `渠道单 ${chN}`, value: 'channel' },
                                    { label: `线下单 ${offN}`, value: 'offline' },
                                ]}
                            />
                        </SearchField>
                        <SearchField label="关键字">
                            <Input value={draftQ} onChange={setDraftQ} onEnterPress={search} showClear placeholder="订单号 / 商品 / 卖家" />
                        </SearchField>
                    </>
                }
            >
                <Select
                    value={chFilter}
                    onChange={(v) => setChFilter(String(v))}
                    style={{ width: 160 }}
                    optionList={[
                        { label: '全部类型', value: 'all' },
                        { label: `渠道单 ${chN}`, value: 'channel' },
                        { label: `线下单 ${offN}`, value: 'offline' },
                    ]}
                />
                <Input
                    value={draftQ}
                    onChange={setDraftQ}
                    onEnterPress={search}
                    showClear
                    placeholder="订单号 / 商品 / 卖家"
                    style={{ width: 220 }}
                />
            </SearchToolbar>

            <Table<Row>
                {...tableProps}
                rowKey={(x) => x?.o.code ?? ''}
                columns={tableColumns}
                dataSource={pool}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>这一页只回答「哪一单的钱还没动、该谁动」。</b>渠道单等卖家去 C 端「待提现」发起，
                线下单等我们在订单管理点「登记打款」—— 后者是我们自己的待办，所以单独一张卡，它比「催卖家」更不该积压。
                <br />
                <b>后台不代发起提现。</b>提现要卖家自己填收款账户、自己看手续费 —— 后台代发等于替他做资金决定，出了问题也说不清是谁的意思。
                <br />
                超过 7 天的单会标红：正常卖家用过一两次就会来提，压一周以上通常是「没找到入口」或「已经不用这个 App 了」。
            </div>

            {detail ? (
                <OrderDetailDrawer
                    order={detail}
                    withdrawal={withdrawals.find((w) => w.orderCode === detail.code)}
                    feePct={feePct}
                    guarRule={rule?.guar}
                    onClose={() => setDetail(null)}
                />
            ) : null}
        </PageContainer>
    );
}

function bucketOfLabel(k: AgeBucket): string {
    return { all: '全部', new: '3 天内', '3d': '3–6 天', '7d': '7 天以上' }[k];
}
