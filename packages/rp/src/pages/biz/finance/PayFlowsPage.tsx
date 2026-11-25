import { Button, Input, Select, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { PAY_CHANNEL_ALIAS, PAY_GROUPS, PAY_ST, money0, payGroupOf } from '@/biz/biz-dict';
import { useBizRows } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizOrderView, BizPaymentView } from '@/types/biz';
import { useCreateExport } from '../export-job';
import { BizStatus, BizTabs, BizToneTag, KpiRow, Money, StatRules } from '../shared';

const aliasOf = (ch: string) => (ch ? PAY_CHANNEL_ALIAS[ch] ?? ch : '—');

/** 只有真的付成功了才有「支付完成时间」：待支付 / 失败一律空 */
const doneAtOf = (p: BizPaymentView, orders: BizOrderView[]) =>
    ['paid', 'done'].includes(p.state) ? orders.find((o) => o.code === p.orderCode)?.payAt ?? '' : '';

export default function PayFlowsPage() {
    const [tab, setTab] = useState('all');
    const [draftQ, setDraftQ] = useState('');
    const [draftCh, setDraftCh] = useState('all');
    const [q, setQ] = useState('');
    const [ch, setCh] = useState('all');
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data: payments = [], isFetching, refetch } = useBizRows<BizPaymentView>('bizPayment');
    const { data: orders = [] } = useBizRows<BizOrderView>('bizOrder');
    const createExport = useCreateExport();

    const items = useMemo(
        () =>
            payments.map((p) => ({
                p,
                ch: aliasOf(p.channel),
                grp: payGroupOf(p.state),
                sellerId: orders.find((o) => o.code === p.orderCode)?.sellerId ?? '',
                doneAt: doneAtOf(p, orders),
            })),
        [payments, orders],
    );

    const pool = tab === 'all' ? items : items.filter((x) => x.grp === tab);
    const list = pool
        .filter((x) => {
            if (ch !== 'all' && x.ch !== ch) return false;
            if (q) {
                const hay = `${x.p.orderCode} ${x.p.pno} ${x.p.tradeNo} ${x.ch} ${x.p.uid} ${x.sellerId}`.toLowerCase();
                if (!hay.includes(q.toLowerCase())) return false;
            }
            return true;
        })
        .slice()
        .sort((a, b) => String(b.p.createdAt).localeCompare(String(a.p.createdAt)));

    /* KPI：全量口径，不随页签 / 筛选变化 */
    const ok = items.filter((x) => x.grp === 'ok');
    const okAmt = ok.reduce((s, x) => s + x.p.amt, 0);
    const failN = items.filter((x) => x.grp === 'fail').length;
    const waitN = items.filter((x) => x.grp === 'wait').length;
    const oddN = items.filter((x) => x.grp === 'unknown').length;
    const settled = ok.length + failN;
    const rate = settled ? Math.round((ok.length / settled) * 1000) / 10 : 0;

    const chOptions = [{ label: '全部渠道', value: 'all' }].concat(
        [...new Set(items.map((x) => x.ch))]
            .filter((x) => x && x !== '—')
            .map((x) => ({ label: x, value: x })),
    );

    const search = () => {
        setQ(draftQ.trim());
        setCh(draftCh);
    };
    const reset = () => {
        setDraftQ('');
        setDraftCh('all');
        setQ('');
        setCh('all');
    };

    const conditions: SearchCondition[] = [];
    if (q)
        conditions.push({
            key: 'q',
            label: '关键字',
            value: q,
            onRemove: () => {
                setQ('');
                setDraftQ('');
            },
        });
    if (ch !== 'all')
        conditions.push({
            key: 'ch',
            label: '支付渠道',
            value: ch,
            onRemove: () => {
                setCh('all');
                setDraftCh('all');
            },
        });

    const columns: ColumnProps<(typeof items)[number]>[] = [
        {
            title: '业务订单号',
            dataIndex: 'orderCode',
            width: 124,
            render: (_: unknown, r) => <span className="biz-mono">{r.p.orderCode}</span>,
        },
        {
            title: '三方流水号',
            dataIndex: 'tradeNo',
            width: 186,
            render: (_: unknown, r) =>
                r.p.tradeNo ? (
                    <span className="biz-mono biz-cell__sub" title={r.p.tradeNo}>
                        {r.p.tradeNo}
                    </span>
                ) : (
                    <span className="biz-dim">—</span>
                ),
        },
        {
            title: '支付订单编号',
            dataIndex: 'pno',
            width: 128,
            render: (_: unknown, r) => <span className="biz-mono">{r.p.pno}</span>,
        },
        {
            title: '支付渠道',
            dataIndex: 'ch',
            width: 118,
            render: (_: unknown, r) => {
                if (r.ch === '—') return <span className="biz-dim">—</span>;
                // 色调按通道类型分：聚合收银台 / 扫码 / 其他，扫一眼能分出走的哪一类
                const tone = r.ch.includes('聚合') ? 'violet' : r.ch.includes('扫码') ? 'ok' : 'brand';
                return <BizToneTag tone={tone}>{r.ch}</BizToneTag>;
            },
        },
        {
            title: '支付金额（元）',
            dataIndex: 'amt',
            width: 118,
            align: 'right',
            render: (_: unknown, r) => <Money value={r.p.amt} />,
        },
        {
            title: '状态',
            dataIndex: 'state',
            width: 110,
            render: (_: unknown, r) => <BizStatus dict={PAY_ST} value={r.p.state} />,
        },
        {
            title: '订单类型',
            dataIndex: 'type',
            width: 92,
            render: () => <span className="biz-dim" style={{ fontSize: 12 }}>游戏账号</span>,
        },
        {
            title: '买家 ID',
            dataIndex: 'uid',
            width: 112,
            render: (_: unknown, r) => (r.p.uid ? <span className="biz-mono">{r.p.uid}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '卖家 ID',
            dataIndex: 'sellerId',
            width: 112,
            render: (_: unknown, r) =>
                r.sellerId ? <span className="biz-mono">{r.sellerId}</span> : <span className="biz-dim" title="示例自营：卖方就是商户本人">—</span>,
        },
        {
            title: '支付完成时间',
            dataIndex: 'doneAt',
            width: 138,
            render: (_: unknown, r) => (r.doneAt ? <span className="biz-num">{r.doneAt}</span> : <span className="biz-dim">—</span>),
        },
    ];

    const { columns: settledCols, columnSettings } = useColumnSettings('biz/pay-flows', columns);

    const exportNow = () => {
        const code = createExport({
            kind: 'payFlows',
            menu: '支付流水',
            filter: `${tab === 'all' ? '全部状态' : PAY_GROUPS.find((g) => g.k === tab)?.t ?? tab}${ch !== 'all' ? ` · ${ch}` : ''}`,
            rows: list.length,
        });
        Toast.success(`已提交导出任务 ${code}`);
    };

    return (
        <PageContainer title="支付流水" extra={<Button onClick={exportNow}>导出</Button>}>
            <KpiRow
                items={[
                    { label: '支付笔数', value: items.length, unit: '笔', desc: '每一笔支付尝试，成功失败都算' },
                    { label: '支付成功金额', value: `¥ ${money0(okAmt)}`, desc: `${ok.length} 笔已成功（含交易完成）` },
                    { label: '成功率', value: rate, unit: '%', desc: `${ok.length} 成功 / ${settled} 有结论 · 只在成功+失败之间算` },
                    {
                        label: '待支付 / 结果未知',
                        value: `${waitN} / ${oddN}`,
                        compact: true,
                        alert: waitN + oddN > 0,
                        desc: `${waitN ? '待支付：用户还没付完' : '没有未完成的支付'}${oddN ? '；结果未知要去渠道查单' : ''}`,
                    },
                ]}
            />
            <StatRules
                items={[
                    <>
                        <b>一行 = 一次支付尝试，不是一个订单、也不是一笔成交。</b>同一张订单换渠道重付、关单后重开，都会各留一行 ——
                        不记尝试，「这个用户付了三次都没成」就永远查不出来。
                    </>,
                    <>
                        <b>成功率 = 成功 ÷（成功 + 失败）</b>，分母<b>不含</b>待支付、已关闭、结果未知 ——
                        把这三类算进分母，成功率会长期偏低。
                    </>,
                    <>
                        <b>待支付 / 结果未知是两件事。</b>待支付是用户没付完；结果未知是渠道没给明确回执，钱可能已经出去了 ——
                        只能去渠道后台查单，<b>不许重发</b>。
                    </>,
                    <>
                        <b>「支付渠道」显示收款通道别名</b>，不是「微信 / 支付宝」：同一个汇付可以开好几条扫码通道。
                    </>,
                    <>
                        <b>卡片是全量口径，不随页签 / 筛选变化</b>；表头「共 X / Y 笔」才是筛选结果。
                    </>,
                ]}
            />

            {oddN ? (
                <div className="biz-calc" style={{ marginBottom: 12 }}>
                    <b className="biz-warn">有 {oddN} 笔支付结果未知。</b>这类单钱可能已经出去了，只有渠道回执能定性 ——
                    去三方后台查单，<b>不要重发</b>（重发可能出现两笔）。
                </div>
            ) : null}

            <BizTabs
                items={[
                    { key: 'all', label: '全部', count: items.length },
                    ...PAY_GROUPS.map((g) => ({
                        key: g.k,
                        label: g.t,
                        count: items.filter((x) => x.grp === g.k).length,
                    })).filter((t) => t.count > 0),
                ]}
                value={tab}
                onChange={setTab}
                hint={`共 ${list.length} / ${items.length} 笔`}
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
                        <SearchField label="关键字">
                            <Input
                                placeholder="订单号 / 支付单号 / 流水号 / 买家或卖家 ID"
                                value={draftQ}
                                onChange={setDraftQ}
                                onEnterPress={search}
                                showClear
                            />
                        </SearchField>
                        <SearchField label="支付渠道">
                            <Select value={draftCh} onChange={(v) => setDraftCh(String(v))} optionList={chOptions} style={{ width: '100%' }} />
                        </SearchField>
                    </>
                }
            >
                <Input
                    placeholder="订单号 / 支付单号 / 流水号 / 买家或卖家 ID"
                    value={draftQ}
                    onChange={setDraftQ}
                    onEnterPress={search}
                    showClear
                    style={{ width: 300 }}
                />
                <Select value={draftCh} onChange={(v) => setDraftCh(String(v))} optionList={chOptions} style={{ width: 150 }} />
            </SearchToolbar>

            <Table<(typeof items)[number]>
                {...tableProps}
                rowKey={(r) => r?.p.code ?? ''}
                columns={settledCols}
                dataSource={list}
                loading={isFetching}
                scroll={{ x: tableScrollX(settledCols) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>这一页收的是「所有渠道订单的支付流水」，不管成功还是失败。</b>
                失败、待支付、结果未知都留着 —— 只记成功的流水看着干净，但「这个用户付了三次都没成」这种问题就永远查不出来。
                <b>线下单不进这一页</b>（没有支付单）。
                <br />
                <b>这一页只读。</b>退款在「退款管理」，出款在「提现管理」。
            </div>
        </PageContainer>
    );
}
