import { Button, Input, InputNumber, Modal, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { REFUND_SRC, REFUND_ST, money, money0 } from '@/biz/biz-dict';
import { useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizPaymentView, BizRefundView } from '@/types/biz';
import { useCreateExport } from '../export-job';
import { Field, nowText } from '../orders/OrdersModals';
import { BizStatus, BizTabs, Cell, KpiRow, Money, StatRules } from '../shared';

/** 时间桶：退款时间离现在多少天。空值 = 还没退款 */
function refundBucket(v: string): string {
    if (!v) return 'none';
    const d = new Date(`${v.slice(0, 10)}T00:00:00`).getTime();
    if (Number.isNaN(d)) return 'none';
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days = Math.round((today.getTime() - d) / 86400000);
    if (days <= 0) return 'today';
    if (days <= 7) return '7d';
    if (days <= 30) return '30d';
    return 'old';
}

const TIME_TABS = [
    { key: 'all', label: '全部退款时间' },
    { key: 'today', label: '今天' },
    { key: '7d', label: '近 7 天' },
    { key: '30d', label: '近 30 天' },
    { key: 'old', label: '30 天前' },
    { key: 'none', label: '还没退款' },
];

/* ---------- 修改备注 ---------- */

function RemarkModal({ record, onClose }: { record: BizRefundView; onClose: () => void }) {
    const update = useBizUpdate<BizRefundView>('bizRefund');
    const [remark, setRemark] = useState(record.remark);
    return (
        <Modal
            title={`修改备注 · ${record.code}`}
            visible
            width={480}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button
                        type="primary"
                        theme="solid"
                        loading={update.isPending}
                        onClick={() =>
                            update.mutate(
                                { id: record.id, body: { remark: remark.trim() } },
                                {
                                    onSuccess: () => {
                                        Toast.success('备注已更新');
                                        onClose();
                                    },
                                },
                            )
                        }
                    >
                        保存
                    </Button>
                </Space>
            }
        >
            <div className="biz-dim" style={{ fontSize: 12, marginBottom: 10 }}>
                {record.orderCode} · ¥{money(record.amt)}
            </div>
            <Field label="备注" hint="备注只给自己人看，不会同步给买家；改动会记进日志">
                <Input value={remark} onChange={setRemark} placeholder="如 已联系买家，等换卡后重发" />
            </Field>
        </Modal>
    );
}

/* ---------- 线下退登记 ---------- */

function OfflineRefundModal({ record, onClose }: { record: BizRefundView; onClose: () => void }) {
    const update = useBizUpdate<BizRefundView>('bizRefund');
    const [amt, setAmt] = useState<number>(record.amt);
    const [proof, setProof] = useState('');
    const [remark, setRemark] = useState(record.remark);

    const diff = +(amt - record.amt).toFixed(2);

    const submit = () => {
        if (!amt || amt <= 0) {
            Toast.warning('打款金额必须大于 0');
            return;
        }
        if (!proof.trim()) {
            Toast.warning('请填写渠道退款成功截图（凭证是唯一依据）');
            return;
        }
        update.mutate(
            {
                id: record.id,
                body: {
                    state: 'success',
                    refundAt: nowText(),
                    remark: remark.trim(),
                    offline: { amt, proof: proof.trim(), at: nowText(), by: '原型管理员', remark: remark.trim() },
                    failWhy: '',
                },
            },
            {
                onSuccess: () => {
                    Toast.success('已登记退款成功');
                    onClose();
                },
            },
        );
    };

    return (
        <Modal
            title="线下退 · 登记退款结果"
            visible
            width={580}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={update.isPending} onClick={submit}>
                        确认已退款
                    </Button>
                </Space>
            }
        >
            <dl className="biz-dl" style={{ marginBottom: 14 }}>
                <dt>订单编号</dt>
                <dd className="biz-mono">{record.orderCode}</dd>
                <dt>应退金额</dt>
                <dd className="biz-num">
                    <b>¥ {money(record.amt)}</b>
                    <span className="biz-dim"> 按退款单，不可改</span>
                </dd>
                {record.state === 'failed' ? (
                    <>
                        <dt>渠道结论</dt>
                        <dd className="biz-danger">{record.failWhy || '渠道明确失败'}</dd>
                    </>
                ) : null}
            </dl>
            <Field label="打款金额（必填）">
                <InputNumber
                    value={amt}
                    min={0}
                    precision={2}
                    style={{ width: '100%' }}
                    onChange={(v) => setAmt(typeof v === 'number' ? v : record.amt)}
                />
            </Field>
            <div className={`biz-calc${diff > 0 ? ' biz-calc--bad' : ''}`} style={{ marginTop: -6, marginBottom: 12 }}>
                {diff === 0
                    ? '实际打给买家的钱；与退款金额一致。'
                    : diff < 0
                      ? `比应退少 ¥${money(-diff)} —— 差额原因必须写进备注。`
                      : `比应退多 ¥${money(diff)} —— 多退的钱要从别处追，确认清楚再提交。`}
            </div>
            <Field label="渠道退款成功截图（必填）" hint="系统拿不到渠道回执，没有凭证就无法向任何人证明钱退过">
                <Input value={proof} onChange={setProof} placeholder="如 退款凭证-RF261103006.jpg" />
            </Field>
            <Field label="备注">
                <Input value={remark} onChange={setRemark} placeholder="如 渠道退款失败，已从渠道后台人工退款（渠道单号 xxx）" />
            </Field>
            <div className="biz-calc">
                <b>先确认渠道那边的结论，再来点这个按钮。</b>
                <br />
                ① 渠道显示<b>已退款成功</b> → 直接填金额、贴截图、登记；
                <br />
                ② 渠道显示<b>退款失败</b> → 平台联系渠道，从<b>渠道后台人工退款</b>，成功后再回来登记。
            </div>
        </Modal>
    );
}

/* ---------- 退款日志 ---------- */

function RefundLogModal({ record, payment, onClose }: { record: BizRefundView; payment?: BizPaymentView | undefined; onClose: () => void }) {
    const items = [
        { at: record.createdAt, who: record.operator, text: `创建退款单 · ${record.reason}` },
        ...(payment ? [{ at: record.createdAt, who: '系统', text: `扣减可退额度：支付单 ${payment.code} 标记在途 ¥${money(record.amt)}` }] : []),
        ...(record.state === 'failed' && record.failWhy ? [{ at: record.refundAt || record.createdAt, who: '渠道', text: `退款失败：${record.failWhy}` }] : []),
        ...(record.state === 'unknown' ? [{ at: record.createdAt, who: '渠道', text: '超时无回执，转「结果未知」；只查不重发' }] : []),
        ...(record.offline
            ? [{ at: record.offline.at, who: record.offline.by, text: `线下打款 ¥${money(record.offline.amt)}，凭证 ${record.offline.proof}` }]
            : []),
        ...(record.state === 'success' && record.refundAt
            ? [{ at: record.refundAt, who: record.offline ? record.offline.by : '渠道', text: '退款完成，商品单转「已退款」' }]
            : []),
    ];
    return (
        <Modal title={`退款日志 · ${record.code}`} visible width={600} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <BizStatus dict={REFUND_ST} value={record.state} />
                <BizStatus dict={REFUND_SRC} value={record.src} />
                {record.offline ? <BizStatus dict={{ offline: { t: '线下退', tone: 'warn' } }} value="offline" /> : null}
            </div>
            <dl className="biz-dl">
                <dt>退款批次号</dt>
                <dd className="biz-mono">{record.batch || '—'}</dd>
                <dt>支付交易号</dt>
                <dd className="biz-mono">{payment?.tradeNo || '线下无交易号'}</dd>
                <dt>支付来源</dt>
                <dd>{payment?.payway || '—'}</dd>
                <dt>可退基准</dt>
                <dd>
                    {payment ? (
                        `支付 ¥${money(payment.amt)} · 已退 ¥${money(payment.refunded)} · 在途 ¥${money(payment.inflight)}`
                    ) : (
                        <span className="biz-dim">线下单没有支付单，按订单金额</span>
                    )}
                </dd>
            </dl>
            <div className="biz-section-title">时间线</div>
            <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
                {items.map((it, i) => (
                    <div key={i} style={{ width: '100%' }}>
                        <div style={{ fontSize: 13 }}>{it.text}</div>
                        <div className="biz-dim" style={{ fontSize: 11 }}>
                            {it.at} · {it.who}
                        </div>
                    </div>
                ))}
            </Space>
        </Modal>
    );
}

/* ---------- 页面 ---------- */

export default function RefundsPage() {
    const [tab, setTab] = useState('all');
    const [timeTab, setTimeTab] = useState('all');
    const [draftQ, setDraftQ] = useState('');
    const [draftOrder, setDraftOrder] = useState('');
    const [q, setQ] = useState('');
    const [orderCode, setOrderCode] = useState('');
    const [remarkOf, setRemarkOf] = useState<BizRefundView | null>(null);
    const [offlineOf, setOfflineOf] = useState<BizRefundView | null>(null);
    const [logOf, setLogOf] = useState<BizRefundView | null>(null);
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data = [], isFetching, refetch } = useBizRows<BizRefundView>('bizRefund');
    const { data: payments = [] } = useBizRows<BizPaymentView>('bizPayment');
    const createExport = useCreateExport();

    const payOf = (r: BizRefundView) => payments.find((p) => p.code === r.payCode);

    const list = useMemo(
        () =>
            data
                .filter((r) => {
                    if (tab !== 'all' && r.state !== tab) return false;
                    if (timeTab !== 'all' && refundBucket(r.refundAt) !== timeTab) return false;
                    if (orderCode && !r.orderCode.toLowerCase().includes(orderCode.toLowerCase())) return false;
                    if (q) {
                        const hay = `${r.code} ${r.batch} ${r.orderCode} ${r.uid} ${r.reason}`.toLowerCase();
                        if (!hay.includes(q.toLowerCase())) return false;
                    }
                    return true;
                })
                .slice()
                .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt))),
        [data, tab, timeTab, orderCode, q],
    );

    const cnt = (st: string) => data.filter((r) => r.state === st).length;
    const sumOf = (states: string[]) => +data.filter((r) => states.includes(r.state)).reduce((s, r) => s + r.amt, 0).toFixed(2);
    const inFlight = sumOf(['processing', 'unknown']);
    const okAmt = sumOf(['success']);
    const failAmt = sumOf(['failed']);

    const search = () => {
        setQ(draftQ.trim());
        setOrderCode(draftOrder.trim());
    };
    const reset = () => {
        setDraftQ('');
        setDraftOrder('');
        setQ('');
        setOrderCode('');
        setTimeTab('all');
    };

    const conditions: SearchCondition[] = [];
    if (q)
        conditions.push({ key: 'q', label: '关键字', value: q, onRemove: () => { setQ(''); setDraftQ(''); } });
    if (orderCode)
        conditions.push({ key: 'order', label: '订单编号', value: orderCode, onRemove: () => { setOrderCode(''); setDraftOrder(''); } });
    if (timeTab !== 'all')
        conditions.push({
            key: 'time',
            label: '退款时间',
            value: TIME_TABS.find((t) => t.key === timeTab)?.label ?? timeTab,
            onRemove: () => setTimeTab('all'),
        });

    const columns: ColumnProps<BizRefundView>[] = [
        {
            title: '退款单号 / 批次号',
            dataIndex: 'code',
            width: 148,
            render: (_: unknown, r) => (
                <Cell
                    main={<span className="biz-mono">{r.code}</span>}
                    sub={r.batch || '—'}
                />
            ),
        },
        {
            title: '支付交易号',
            dataIndex: 'payCode',
            width: 176,
            render: (_: unknown, r) => {
                const p = payOf(r);
                return p?.tradeNo ? (
                    <span className="biz-mono biz-cell__sub" title={p.tradeNo}>
                        {p.tradeNo}
                    </span>
                ) : (
                    <span className="biz-dim" style={{ fontSize: 12 }}>
                        线下无交易号
                    </span>
                );
            },
        },
        {
            title: '订单编号 / 类型',
            dataIndex: 'orderCode',
            width: 132,
            render: (_: unknown, r) => <Cell main={<span className="biz-mono">{r.orderCode}</span>} sub="游戏账号" />,
        },
        {
            title: '支付来源',
            dataIndex: 'payCode',
            width: 92,
            render: (_: unknown, r) => {
                const way = payOf(r)?.payway;
                return way ? (
                    <BizStatus dict={{ 微信: { t: '微信', tone: 'ok' }, 支付宝: { t: '支付宝', tone: 'brand' } }} value={way} fallback={way} />
                ) : (
                    <span className="biz-dim">—</span>
                );
            },
        },
        { title: '用户 id', dataIndex: 'uid', width: 112, render: (v: string) => <span className="biz-mono">{v || '—'}</span> },
        { title: '金额（元）', dataIndex: 'amt', width: 110, align: 'right', render: (v: number) => <Money value={v} /> },
        {
            title: '退款状态',
            dataIndex: 'state',
            width: 104,
            render: (v: string) => <BizStatus dict={REFUND_ST} value={v} />,
        },
        {
            title: '失败原因',
            dataIndex: 'failWhy',
            width: 208,
            render: (v: string) => (v ? <span className="biz-danger biz-cell__sub" title={v}>{v}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '退款时间',
            dataIndex: 'refundAt',
            width: 128,
            render: (v: string) => (v ? <span className="biz-num">{v.slice(5)}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '备注',
            dataIndex: 'remark',
            width: 168,
            render: (v: string) => (
                <span className="biz-cell__sub" title={v}>
                    {v || '点击添加'}
                </span>
            ),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 220 },
    ];

    const actionsOf = (r: BizRefundView): TableAction[] => [
        { key: 'remark', label: '备注', onClick: () => setRemarkOf(r) },
        r.state === 'success'
            ? {
                  key: 'done',
                  label: r.offline ? '已线下退' : '已退款',
                  disabled: true,
                  onClick: () => undefined,
              }
            : { key: 'offline', label: '线下退', onClick: () => setOfflineOf(r) },
        { key: 'log', label: '日志', onClick: () => setLogOf(r) },
    ];

    const { columns: settledCols, columnSettings } = useColumnSettings('biz/refunds', columns);
    const { columns: tableColumns } = useActionsColumn(settledCols, actionsOf);

    const exportNow = () => {
        const code = createExport({
            kind: 'refunds',
            menu: '退款管理',
            filter: `${tab === 'all' ? '全部状态' : REFUND_ST[tab]?.t ?? tab} · ${TIME_TABS.find((t) => t.key === timeTab)?.label ?? '全部时间'}`,
            rows: list.length,
        });
        Toast.success(`已提交导出任务 ${code}`);
    };

    return (
        <PageContainer title="退款管理" extra={<Button onClick={exportNow}>导出</Button>}>
            <KpiRow
                items={[
                    { label: '退款单数', value: data.length, unit: '笔', desc: '全量 · 四类来源合并' },
                    { label: '退款成功', value: cnt('success'), unit: '笔', desc: `¥${money(okAmt)} · 回执 / 凭证已留底` },
                    { label: '在途金额', value: `¥ ${money0(inFlight)}`, alert: inFlight > 0, desc: '退款中 + 结果未知 · 不含失败' },
                    { label: '退款失败', value: cnt('failed'), unit: '笔', alert: cnt('failed') > 0, desc: `¥${money(failAmt)} · 去渠道查，回来「线下退」登记` },
                ]}
            />
            <StatRules
                items={[
                    '<b>一行 = 一张退款单，不是一次操作。</b>同一张订单可能有多张退款单（部分退、失败后重发），所以「退款单数」不等于「退款过的订单数」。',
                    '<b>在途 = 退款中 + 结果未知的金额之和，不含退款失败</b> —— 失败的钱没出去或已被退回，算进在途会让「在途」同时包含「在路上」和「还在账上」两种相反的钱。',
                    '<b>退款失败不自动重试，只能人去查。</b>渠道失败要先确认「钱到底退没退」，确认没退才重发或改线下退 —— 自动重试在退款上是最危险的动作（可能退两笔）。',
                    '<b>四个状态互斥且合起来是全部单</b>：退款中 / 结果未知 / 成功 / 失败。',
                    '<b>金额口径 = 退款单上的申请金额</b>，不是订单金额：部分退款的单只退其中一部分。',
                ]}
            />

            <BizTabs
                items={[
                    { key: 'all', label: '全部', count: data.length },
                    ...Object.entries(REFUND_ST)
                        .map(([k, v]) => ({ key: k, label: v.t, count: cnt(k) }))
                        .filter((t) => t.count > 0),
                ]}
                value={tab}
                onChange={setTab}
                hint={`共 ${list.length} / ${data.length} 笔`}
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
                        <SearchField label="订单编号">
                            <Input value={draftOrder} onChange={setDraftOrder} onEnterPress={search} showClear placeholder="订单编号" />
                        </SearchField>
                        <SearchField label="关键字">
                            <Input
                                value={draftQ}
                                onChange={setDraftQ}
                                onEnterPress={search}
                                showClear
                                placeholder="退款单号 / 批次号 / 用户 id / 原因"
                            />
                        </SearchField>
                        <SearchField label="退款时间">
                            <Input value={TIME_TABS.find((t) => t.key === timeTab)?.label ?? ''} disabled />
                        </SearchField>
                    </>
                }
            >
                <Input value={draftOrder} onChange={setDraftOrder} onEnterPress={search} showClear placeholder="订单编号" style={{ width: 150 }} />
                <Input
                    value={draftQ}
                    onChange={setDraftQ}
                    onEnterPress={search}
                    showClear
                    placeholder="退款单号 / 批次号 / 用户 id / 原因"
                    style={{ width: 260 }}
                />
            </SearchToolbar>

            <div className="biz-dim" style={{ fontSize: 12, margin: '10px 0 8px' }}>
                退款时间：
                <Space spacing={4} wrap>
                    {TIME_TABS.map((t) => (
                        <Button
                            key={t.key}
                            size="small"
                            theme={timeTab === t.key ? 'solid' : 'borderless'}
                            type={timeTab === t.key ? 'primary' : 'tertiary'}
                            onClick={() => setTimeTab(t.key)}
                        >
                            {t.label}
                        </Button>
                    ))}
                </Space>
            </div>

            <Table<BizRefundView>
                {...tableProps}
                rowKey="code"
                columns={tableColumns}
                dataSource={list}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>退款只按原交易退。</b>「支付交易号」是渠道侧那笔交易的编号，退多少、退到哪都看它。
                <b>渠道退款只能回到原支付账户</b>，不能改卡、不能改支付宝 —— 买家要换账户，就只能走「线下退」。
                <br />
                <b>失败 / 结果未知只有一条路：财务去渠道查。</b>渠道显示已退款成功 → 点「线下退」填实退金额、贴渠道截图直接登记；
                渠道显示退款失败 → 平台联系渠道、从渠道后台人工退款，成功后再回来登记。
            </div>

            {remarkOf ? <RemarkModal record={remarkOf} onClose={() => setRemarkOf(null)} /> : null}
            {offlineOf ? <OfflineRefundModal record={offlineOf} onClose={() => setOfflineOf(null)} /> : null}
            {logOf ? <RefundLogModal record={logOf} payment={payOf(logOf)} onClose={() => setLogOf(null)} /> : null}
        </PageContainer>
    );
}
