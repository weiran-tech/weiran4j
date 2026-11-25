import { Button, Input, Modal, Radio, RadioGroup, Space, Table, Tag, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { SearchField, SearchToolbar, type SearchCondition } from '@/components/SearchToolbar';
import { useActionsColumn, type TableAction } from '@/components/TableActions';
import { WD_ST, money } from '@/biz/biz-dict';
import { useBizRows, useBizUpdate, usePayRule } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizPayRuleView, BizPendWdView, BizWithdrawalView } from '@/types/biz';
import { useCreateExport } from '../export-job';
import { Field, nowText } from '../orders/OrdersModals';
import { BizStatus, BizTabs, Cell, KpiRow, Money, StatRules } from '../shared';

/** 冻结剩余分钟：审核通过后按「收付规则 · 冻结时间」倒数 */
function freezeLeft(w: { frozenAt?: string; freezeFrom?: string; state: string }, freezeMin: number): number {
    if (!freezeMin) return 0;
    if (w.state === 'review') return freezeMin;
    const from = w.freezeFrom ?? w.frozenAt;
    if (!from) return 0;
    const t0 = new Date(String(from).replace(/-/g, '/')).getTime();
    if (!t0) return 0;
    const left = Math.ceil((t0 + freezeMin * 60000 - Date.now()) / 60000);
    return left > 0 ? left : 0;
}

const FAIL_TEXT: Record<string, string> = {
    ali_name_mismatch: '支付宝账号与实名不匹配，渠道退回',
    receipt_lost: '渠道回执丢失，到账结果未知',
};

/** 明细分类小计 */
function itemsSum(items: BizPendWdView['items']) {
    const orders = items.filter((i) => i.kind === 'order');
    const promos = items.filter((i) => i.kind === 'promo');
    return {
        orders,
        promos,
        orderAmt: +orders.reduce((s, i) => s + i.amt, 0).toFixed(2),
        promoAmt: +promos.reduce((s, i) => s + i.amt, 0).toFixed(2),
    };
}

/* ---------- 合并提现单：审核 ---------- */

function ReviewModal({
    record,
    freezeMin,
    onClose,
}: {
    record: BizPendWdView;
    freezeMin: number;
    onClose: () => void;
}) {
    const update = useBizUpdate<BizPendWdView>('bizPendWd');
    const [rejectWhy, setRejectWhy] = useState('');
    const sm = itemsSum(record.items);
    const whyLog = [...record.logs].reverse().find((l) => /转人工审核/.test(l.act))?.note ?? '超免审线 / 商户设置全部转人工';

    const submit = (ok: boolean) => {
        if (!ok && !rejectWhy.trim()) {
            Toast.warning('驳回必须写原因（卖家要照着改）');
            return;
        }
        const at = nowText();
        update.mutate(
            {
                id: record.id,
                body: ok
                    ? {
                          state: freezeMin > 0 ? 'frozen' : 'transfer',
                          reviewBy: '原型管理员',
                          reviewAt: at,
                          ...(freezeMin > 0 ? { frozenAt: at, freezeFrom: at } : {}),
                          logs: [
                              ...record.logs,
                              {
                                  at,
                                  who: '原型管理员（商户 · 财务）',
                                  act: '审核通过',
                                  note: freezeMin > 0 ? `审核通过，冻结 ${freezeMin} 分钟后自动交渠道` : '审核通过，直接交渠道代付',
                              },
                          ],
                      }
                    : {
                          state: 'failed',
                          failCode: 'review_reject',
                          doneAt: at,
                          logs: [
                              ...record.logs,
                              { at, who: '原型管理员（商户 · 财务）', act: '审核驳回', note: rejectWhy.trim() },
                          ],
                      },
            },
            {
                onSuccess: () => {
                    Toast.success(ok ? '已通过，按规则进入冻结 / 打款' : '已驳回，转「提现失败」');
                    onClose();
                },
            },
        );
    };

    return (
        <Modal
            title={`审核 · ${record.code}`}
            visible
            width={580}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button onClick={() => submit(false)} loading={update.isPending}>
                        驳回
                    </Button>
                    <Button type="primary" theme="solid" loading={update.isPending} onClick={() => submit(true)}>
                        通过
                    </Button>
                </Space>
            }
        >
            <dl className="biz-dl" style={{ marginBottom: 12 }}>
                <dt>金额构成</dt>
                <dd>
                    货款 {sm.orders.length} 笔 ¥{money(sm.orderAmt)} + 奖励 {sm.promos.length} 笔 ¥{money(sm.promoAmt)}
                </dd>
                <dt>提交时间</dt>
                <dd className="biz-mono">{record.applyAt || '—'}</dd>
                <dt>到账账户</dt>
                <dd className="biz-mono">
                    {record.path || '—'} {record.account || ''}
                </dd>
                <dt>手续费 / 到账</dt>
                <dd className="biz-num">
                    ¥ {money(record.fee)} / ¥ {money(record.net)}
                </dd>
                <dt>转人工原因</dt>
                <dd className="biz-warn">{whyLog}</dd>
            </dl>
            <Field label="驳回原因（驳回时必填，卖家会照着改）">
                <Input value={rejectWhy} onChange={setRejectWhy} placeholder="如 账户与实名不一致 / 金额与订单不符" />
            </Field>
            <div className="biz-calc">
                通过后{freezeMin > 0 ? `先冻结 ${freezeMin} 分钟` : '立即'}交渠道代付；驳回则转「提现失败」，明细原样保留 ——
                卖家可以整单重提，也可以只把其中一笔拆出来单独提。
            </div>
        </Modal>
    );
}

/* ---------- 合并提现单：异常处置（两个互斥出口） ---------- */

function DisposeModal({ record, onClose }: { record: BizPendWdView; onClose: () => void }) {
    const update = useBizUpdate<BizPendWdView>('bizPendWd');
    const [tab, setTab] = useState<'back' | 'off'>('back');
    const [backProof, setBackProof] = useState('');
    const [offNo, setOffNo] = useState('');
    const [offProof, setOffProof] = useState('');

    const submit = () => {
        const at = nowText();
        if (tab === 'back') {
            if (!backProof.trim()) {
                Toast.warning('请填写未到账凭证（渠道查询结果 / 流水截图）');
                return;
            }
            update.mutate(
                {
                    id: record.id,
                    body: {
                        state: 'failed',
                        failCode: 'verified_not_paid',
                        doneAt: at,
                        logs: [
                            ...record.logs,
                            { at, who: '原型管理员（商户 · 财务）', act: '核实未出款', note: `凭证 ${backProof.trim()}；转提现失败，明细原样保留` },
                        ],
                    },
                },
                {
                    onSuccess: () => {
                        Toast.success('已转「提现失败」，卖家可重提');
                        onClose();
                    },
                },
            );
            return;
        }
        if (!offNo.trim() || !offProof.trim()) {
            Toast.warning('打款流水号与到账凭证都要填');
            return;
        }
        update.mutate(
            {
                id: record.id,
                body: {
                    state: 'arrived',
                    doneAt: at,
                    logs: [
                        ...record.logs,
                        { at, who: '原型管理员（商户 · 财务）', act: '线下打款到账', note: `流水 ${offNo.trim()}，凭证 ${offProof.trim()}；出款结束` },
                    ],
                },
            },
            {
                onSuccess: () => {
                    Toast.success('已登记线下打款，转「已到账」');
                    onClose();
                },
            },
        );
    };

    return (
        <Modal
            title={`处置 · ${record.code}`}
            visible
            width={580}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type={tab === 'off' ? 'primary' : 'tertiary'} theme={tab === 'off' ? 'solid' : 'light'} loading={update.isPending} onClick={submit}>
                        {tab === 'back' ? '确认未出款，转失败' : '确认已打款，转已到账'}
                    </Button>
                </Space>
            }
        >
            <dl className="biz-dl" style={{ marginBottom: 12 }}>
                <dt>异常原因</dt>
                <dd className="biz-warn">{FAIL_TEXT[record.failCode ?? ''] ?? '钱可能已出，回执缺失'}</dd>
                <dt>原到账账户</dt>
                <dd className="biz-mono">
                    {record.path || '—'} {record.account || ''}
                </dd>
                <dt>资金状态</dt>
                <dd className="biz-num">
                    ¥ {money(record.amt)}
                    <span className="biz-dim"> 货款未出 · 仍在平台账上</span>
                </dd>
            </dl>
            <RadioGroup
                type="button"
                value={tab}
                onChange={(e) => setTab(e.target.value as 'back' | 'off')}
                style={{ marginBottom: 10 }}
            >
                <Radio value="back">① 核实未出款</Radio>
                <Radio value="off">② 线下打款</Radio>
            </RadioGroup>
            <div className="biz-dim" style={{ fontSize: 12, marginBottom: 10 }}>
                两个出口互斥，都要凭证 —— 选了哪个就只填哪个。
            </div>
            {tab === 'back' ? (
                <Field label="未到账凭证（必填）" hint="凭证要能看出「这笔单号确实没出款」。提交后单据转「提现失败」，明细原样保留">
                    <Input value={backProof} onChange={setBackProof} placeholder="如 渠道查询结果- PW261106002.png" />
                </Field>
            ) : (
                <>
                    <Field label="打款流水号（必填）">
                        <Input value={offNo} onChange={setOffNo} placeholder="银行 / 支付宝流水号" />
                    </Field>
                    <Field label="到账凭证（必填）" hint="钱是我们自己账户打出去的，凭证就是回执。提交后单据直接转「已到账」">
                        <Input value={offProof} onChange={setOffProof} placeholder="如 转账回单-PW261106002.jpg" />
                    </Field>
                </>
            )}
        </Modal>
    );
}

/* ---------- 合并提现单详情 ---------- */

function PendDetailModal({ record, onClose }: { record: BizPendWdView; onClose: () => void }) {
    const sm = itemsSum(record.items);
    const logs = [...record.logs].reverse();
    return (
        <Modal title={`提现单详情 · ${record.code}`} visible width={640} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <BizStatus dict={WD_ST} value={record.state} />
                <Tag size="small">{record.path || '—'}</Tag>
                <span className="biz-mono biz-dim" style={{ fontSize: 12 }}>
                    {record.account}
                </span>
            </div>
            <dl className="biz-dl">
                <dt>提现金额</dt>
                <dd className="biz-num">
                    <b>¥ {money(record.amt)}</b>
                </dd>
                <dt>手续费</dt>
                <dd className="biz-num">− ¥ {money(record.fee)}</dd>
                <dt>到账金额</dt>
                <dd className="biz-num">¥ {money(record.net)}</dd>
                <dt>明细构成</dt>
                <dd>
                    货款 {sm.orders.length} 笔 ¥{money(sm.orderAmt)} · 奖励 {sm.promos.length} 笔 ¥{money(sm.promoAmt)}
                </dd>
                <dt>提交 / 完成</dt>
                <dd className="biz-num">
                    {record.applyAt || '—'} / {record.doneAt || '—'}
                </dd>
                {record.reviewBy ? (
                    <>
                        <dt>审核人</dt>
                        <dd>
                            {record.reviewBy} · {record.reviewAt}
                        </dd>
                    </>
                ) : null}
            </dl>

            <div className="biz-section-title">明细（{record.items.length} 笔）</div>
            <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                <thead>
                    <tr style={{ background: 'var(--color-table-head-bg)' }}>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>类型</th>
                        <th style={{ textAlign: 'left', padding: '6px 8px' }}>单据</th>
                        <th style={{ textAlign: 'right', padding: '6px 8px' }}>金额</th>
                    </tr>
                </thead>
                <tbody>
                    {record.items.map((it) => (
                        <tr key={`${it.kind}-${it.ref}`} style={{ borderTop: '1px solid var(--color-border)' }}>
                            <td style={{ padding: '6px 8px' }}>{it.kind === 'order' ? '订单货款' : '推广奖励'}</td>
                            <td style={{ padding: '6px 8px' }} className="biz-mono">
                                {it.ref}
                            </td>
                            <td style={{ padding: '6px 8px', textAlign: 'right' }} className="biz-num">
                                ¥ {money(it.amt)}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <div className="biz-section-title">处理记录</div>
            <Space vertical align="start" spacing={8} style={{ width: '100%' }}>
                {logs.map((l, i) => (
                    <div key={i} style={{ width: '100%' }}>
                        <div style={{ fontSize: 12.5 }}>
                            <b>{l.act}</b>
                            <span className="biz-dim"> {l.at} · {l.who}</span>
                        </div>
                        {l.note ? <div style={{ fontSize: 12, lineHeight: 1.7 }}>{l.note}</div> : null}
                    </div>
                ))}
            </Space>
        </Modal>
    );
}

/* ---------- 订单提现详情 ---------- */

function OrderWdDetailModal({ record, onClose }: { record: BizWithdrawalView; onClose: () => void }) {
    const logs = [...record.logs].reverse();
    return (
        <Modal title={`订单提现详情 · ${record.code}`} visible width={620} onCancel={onClose} footer={<Button onClick={onClose}>关闭</Button>}>
            <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
                <BizStatus dict={WD_ST} value={record.state} />
                {record.payMode ? <Tag size="small">{record.payMode === 'offline' ? '人工线下打款' : '渠道代付'}</Tag> : null}
            </div>
            <dl className="biz-dl">
                <dt>关联订单</dt>
                <dd className="biz-mono">{record.orderCode}</dd>
                <dt>卖家</dt>
                <dd>{record.seller}</dd>
                <dt>应提货款</dt>
                <dd className="biz-num">¥ {money(record.amt)}</dd>
                <dt>交易手续费</dt>
                <dd className="biz-num">− ¥ {money(record.commission)}</dd>
                <dt>到账账户</dt>
                <dd className="biz-mono">
                    {record.path || '—'} {record.account}
                </dd>
                <dt>发起 / 提现 / 完成</dt>
                <dd className="biz-num">
                    {record.applyAt || '—'} / {record.payAt || '—'} / {record.doneAt || '—'}
                </dd>
                {record.tradeNo ? (
                    <>
                        <dt>流水号</dt>
                        <dd className="biz-mono">{record.tradeNo}</dd>
                    </>
                ) : null}
                {record.proof ? (
                    <>
                        <dt>凭证</dt>
                        <dd>{record.proof}</dd>
                    </>
                ) : null}
                {record.mergedInto ? (
                    <>
                        <dt>所属提现单</dt>
                        <dd className="biz-mono">{record.mergedInto}</dd>
                    </>
                ) : null}
            </dl>
            <div className="biz-section-title">处理记录</div>
            <Space vertical align="start" spacing={8} style={{ width: '100%' }}>
                {logs.map((l, i) => (
                    <div key={i} style={{ width: '100%' }}>
                        <div style={{ fontSize: 12.5 }}>
                            <b>{l.act}</b>
                            <span className="biz-dim"> {l.at} · {l.who}</span>
                        </div>
                        {l.note ? <div style={{ fontSize: 12, lineHeight: 1.7 }}>{l.note}</div> : null}
                    </div>
                ))}
            </Space>
        </Modal>
    );
}

/* ---------- 页面 ---------- */

export default function WithdrawalsPage() {
    const [tab, setTab] = useState<'pend' | 'order'>('pend');
    const [draftQ, setDraftQ] = useState('');
    const [q, setQ] = useState('');
    const [pendState, setPendState] = useState('all');
    const [orderState, setOrderState] = useState('all');
    const [reviewOf, setReviewOf] = useState<BizPendWdView | null>(null);
    const [disposeOf, setDisposeOf] = useState<BizPendWdView | null>(null);
    const [pendDetail, setPendDetail] = useState<BizPendWdView | null>(null);
    const [orderDetail, setOrderDetail] = useState<BizWithdrawalView | null>(null);
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data: pends = [], isFetching: loadingPend, refetch: refetchPend } = useBizRows<BizPendWdView>('bizPendWd');
    const { data: orders = [], isFetching: loadingOrder, refetch: refetchOrder } = useBizRows<BizWithdrawalView>('bizWithdrawal');
    const { data: rule } = usePayRule<BizPayRuleView>();
    const createExport = useCreateExport();
    const freezeMin = rule?.general.freezeMin ?? 0;

    const pendList = useMemo(
        () =>
            pends
                .filter((w) => {
                    if (pendState === 'out' ? !['frozen', 'transfer'].includes(w.state) : pendState !== 'all' && w.state !== pendState) return false;
                    const hay = `${w.code} ${w.seller} ${w.account}`.toLowerCase();
                    return !q || hay.includes(q.toLowerCase());
                })
                .slice()
                .sort((a, b) => String(b.applyAt || b.doneAt).localeCompare(String(a.applyAt || a.doneAt))),
        [pends, pendState, q],
    );

    const orderList = useMemo(
        () =>
            orders
                .filter((w) => {
                    if (orderState !== 'all' && w.state !== orderState) return false;
                    const hay = `${w.code} ${w.orderCode} ${w.seller} ${w.account}`.toLowerCase();
                    return !q || hay.includes(q.toLowerCase());
                })
                .slice()
                .sort((a, b) => String(b.applyAt || b.doneAt).localeCompare(String(a.applyAt || a.doneAt))),
        [orders, orderState, q],
    );

    const pendCnt = (st: string) => pends.filter((w) => w.state === st).length;
    const pendSum = (states: string[]) => +pends.filter((w) => states.includes(w.state)).reduce((s, w) => s + w.amt, 0).toFixed(2);
    const liveAmt = pendSum(['review', 'frozen', 'transfer', 'abnormal']);
    const doingN = pendCnt('frozen') + pendCnt('transfer');

    const orderCnt = (st: string) => orders.filter((w) => w.state === st).length;

    const search = () => setQ(draftQ.trim());
    const reset = () => {
        setDraftQ('');
        setQ('');
        setPendState('all');
        setOrderState('all');
    };

    const conditions: SearchCondition[] = q
        ? [{ key: 'q', label: '关键字', value: q, onRemove: () => { setQ(''); setDraftQ(''); } }]
        : [];

    const stCell = (w: BizPendWdView) => {
        const bad = w.state === 'failed' || w.state === 'abnormal';
        const left = w.state === 'frozen' ? freezeLeft(w, freezeMin) : 0;
        return (
            <Cell
                main={<BizStatus dict={WD_ST} value={w.state} />}
                sub={
                    bad
                        ? FAIL_TEXT[w.failCode ?? ''] ?? '渠道退回'
                        : w.state === 'frozen'
                          ? left > 0
                              ? `剩 ${left} 分钟自动打款`
                              : '已到期 · 待交渠道'
                          : w.state === 'review'
                            ? '未冻结 · 等审核'
                            : undefined
                }
                subDanger={bad || w.state === 'review'}
            />
        );
    };

    const pendColumns: ColumnProps<BizPendWdView>[] = [
        {
            title: '提现单',
            dataIndex: 'code',
            width: 124,
            render: (_: unknown, w) => (
                <Cell
                    main={<span className="biz-mono">{w.code}</span>}
                    sub={w.retries ? `重试 ${w.retries} 次` : undefined}
                />
            ),
        },
        { title: '卖家', dataIndex: 'seller', width: 158, render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
        { title: '金额', dataIndex: 'amt', width: 116, align: 'right', render: (v: number) => <Money value={v} /> },
        {
            title: '明细构成',
            dataIndex: 'items',
            width: 118,
            render: (_: unknown, w) => {
                const sm = itemsSum(w.items);
                const parts = [];
                if (sm.orders.length) parts.push(`货款 ${sm.orders.length}`);
                if (sm.promos.length) parts.push(`奖励 ${sm.promos.length}`);
                return <Cell main={<span style={{ fontSize: 12 }}>{parts.join(' + ') || '—'}</span>} sub={`共 ${w.items.length} 笔`} />;
            },
        },
        { title: '状态', dataIndex: 'state', width: 172, render: (_: unknown, w) => stCell(w) },
        {
            title: '路径 / 账户',
            dataIndex: 'path',
            width: 172,
            render: (_: unknown, w) =>
                !w.path || w.path === '—' ? (
                    <span className="biz-dim">—</span>
                ) : (
                    <Cell main={<span style={{ fontSize: 12 }}>{w.path}</span>} sub={w.account} />
                ),
        },
        {
            title: '发起时间',
            dataIndex: 'applyAt',
            width: 128,
            render: (v: string) => (v ? <span className="biz-num">{v.slice(5)}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '完成时间',
            dataIndex: 'doneAt',
            width: 128,
            render: (v: string) => (v ? <span className="biz-num">{v.slice(5)}</span> : <span className="biz-dim">—</span>),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 132 },
    ];

    const pendActions = (w: BizPendWdView): TableAction[] => [
        ...(w.state === 'review' ? [{ key: 'review', label: '审核', onClick: () => setReviewOf(w) }] : []),
        ...(w.state === 'abnormal' ? [{ key: 'dispose', label: '处置', onClick: () => setDisposeOf(w) }] : []),
        { key: 'detail', label: '详情', onClick: () => setPendDetail(w) },
    ];

    const orderColumns: ColumnProps<BizWithdrawalView>[] = [
        { title: '提现单', dataIndex: 'code', width: 120, render: (v: string) => <span className="biz-mono">{v}</span> },
        { title: '订单', dataIndex: 'orderCode', width: 120, render: (v: string) => <span className="biz-mono biz-dim">{v}</span> },
        { title: '卖家', dataIndex: 'seller', width: 150, render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
        { title: '金额', dataIndex: 'amt', width: 110, align: 'right', render: (v: number) => <Money value={v} /> },
        {
            title: '状态',
            dataIndex: 'state',
            width: 148,
            render: (v: string) => <BizStatus dict={WD_ST} value={v} />,
        },
        {
            title: '路径 / 账户',
            dataIndex: 'path',
            width: 178,
            render: (_: unknown, w) =>
                !w.path || w.path === '—' ? (
                    <span className="biz-dim">—</span>
                ) : (
                    <Cell main={<span style={{ fontSize: 12 }}>{w.path}</span>} sub={w.account} />
                ),
        },
        {
            title: '发起时间',
            dataIndex: 'applyAt',
            width: 122,
            render: (v: string) => (v ? <span className="biz-num">{v.slice(5)}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '完成时间',
            dataIndex: 'doneAt',
            width: 122,
            render: (v: string) => (v ? <span className="biz-num">{v.slice(5)}</span> : <span className="biz-dim">—</span>),
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 116 },
    ];

    const orderActions = (w: BizWithdrawalView): TableAction[] => [
        {
            key: 'detail',
            label: w.state === 'merged' && w.mergedInto ? '所属提现单' : '详情',
            onClick: () => {
                if (w.state === 'merged' && w.mergedInto) {
                    const target = pends.find((p) => p.code === w.mergedInto);
                    if (target) {
                        setPendDetail(target);
                        return;
                    }
                    Toast.info(`所属提现单 ${w.mergedInto} 已不在列表中`);
                    return;
                }
                setOrderDetail(w);
            },
        },
    ];

    const { columns: pendSettled, columnSettings: pendSettings } = useColumnSettings('biz/withdrawals-pend', pendColumns);
    const { columns: pendTableColumns } = useActionsColumn(pendSettled, pendActions);
    const { columns: orderSettled, columnSettings: orderSettings } = useColumnSettings('biz/withdrawals-order', orderColumns);
    const { columns: orderTableColumns } = useActionsColumn(orderSettled, orderActions);

    const exportNow = () => {
        const code = createExport({
            kind: tab === 'pend' ? 'wdPend' : 'wdOrder',
            menu: tab === 'pend' ? '合并提现单' : '订单提现',
            filter: '全部状态',
            rows: tab === 'pend' ? pendList.length : orderList.length,
        });
        Toast.success(`已提交导出任务 ${code}`);
    };

    return (
        <PageContainer title="提现管理" extra={<Button onClick={exportNow}>导出</Button>}>
            {tab === 'pend' ? (
                <KpiRow
                    items={[
                        { label: '待审核', value: pendCnt('review'), unit: '笔', alert: pendCnt('review') > 0, desc: '等商户放行 · 含多笔货款与奖励' },
                        { label: '在办（冻结 / 打款中）', value: doingN, unit: '笔', desc: `在办 + 待审核 + 异常合计 ¥${money(liveAmt)}` },
                        { label: '已到账', value: pendCnt('arrived'), unit: '笔', desc: '到账后明细里的每一笔都结束' },
                        { label: '提现异常', value: pendCnt('abnormal'), unit: '笔', alert: pendCnt('abnormal') > 0, desc: '钱可能已出 · 只能人工核，不能重发' },
                    ]}
                />
            ) : (
                <KpiRow
                    items={[
                        { label: '待提现', value: orderCnt('wait'), unit: '笔', alert: orderCnt('wait') > 0, desc: '交易已完成 · 等卖家自己发起' },
                        { label: '已并入提现单', value: orderCnt('merged'), unit: '笔', desc: '在办 / 成功 / 失败都看那张单' },
                        { label: '已到账', value: orderCnt('arrived'), unit: '笔', desc: '钱已到卖家账户（含历史单笔）' },
                        { label: '已关闭', value: orderCnt('closed'), unit: '笔', desc: '订单取消 · 货款已退回买家' },
                    ]}
                />
            )}

            <StatRules
                items={
                    tab === 'pend'
                        ? [
                              '<b>一张单只进一个状态。</b>待审核放行后进冻结 / 打款中，异常与失败是旁支，已到账是终态。',
                              '<b>在办 = 冻结中 + 打款中。</b>共同点：钱已离开「可提现」、还没到卖家手上、我们不需要做判断。异常不在这里 —— 它等我们核。',
                              '<b>已到账 = 状态 arrived</b>，含渠道代付成功与人工线下打款成功。',
                              '<b>提现异常两种来源：渠道回执丢失与四金额加不回来。</b>都不能重发 —— 重发就是可能出两笔钱。',
                              '<b>金额一律用「提现单金额」（Σ 明细）</b>，不是订单金额。',
                          ]
                        : [
                              '<b>这一页一行 = 一笔货款</b>（一个订单最多一条），不承载审核与打款状态 —— 那套状态只在提现单上。',
                              '<b>订单提现单只有三个实际状态</b>：待提现 / 已并入提现单 / 已关闭；历史单可能停在「已到账」。',
                              '<b>待提现 ≠ C 端「可提现」。</b>C 端的可提现还包含提现失败的钱（仍在平台、可以重提）。',
                              '<b>自营单不会出现在这张表里</b> —— 货款随「结算单」出款，没有向自己提现这回事。',
                          ]
                }
            />

            <BizTabs
                items={[
                    { key: 'pend', label: '合并提现单', count: pends.length },
                    { key: 'order', label: '订单提现', count: orders.length },
                ]}
                value={tab}
                onChange={(k) => {
                    setTab(k as 'pend' | 'order');
                    reset();
                }}
                hint={tab === 'pend' ? '一次「全部提现」一张单 · 明细里逐笔列出货款与奖励' : '一单一笔货款 · 被合并的那几笔只留指针'}
            />

            {tab === 'pend' ? (
                <div className="biz-dim" style={{ fontSize: 12, margin: '10px 0 8px' }}>
                    状态：
                    <Space spacing={4} wrap>
                        {[
                            { key: 'all', label: '全部', n: pends.length },
                            { key: 'review', label: '待审核', n: pendCnt('review') },
                            { key: 'out', label: '出款中', n: doingN },
                            { key: 'arrived', label: '已到账', n: pendCnt('arrived') },
                            { key: 'failed', label: '提现失败', n: pendCnt('failed') },
                            { key: 'abnormal', label: '提现异常', n: pendCnt('abnormal') },
                        ]
                            .filter((t) => t.key === 'all' || t.n > 0)
                            .map((t) => (
                                <Button
                                    key={t.key}
                                    size="small"
                                    theme={pendState === t.key ? 'solid' : 'borderless'}
                                    type={pendState === t.key ? 'primary' : 'tertiary'}
                                    onClick={() => setPendState(t.key)}
                                >
                                    {t.label} {t.n}
                                </Button>
                            ))}
                    </Space>
                </div>
            ) : (
                <div className="biz-dim" style={{ fontSize: 12, margin: '10px 0 8px' }}>
                    状态：
                    <Space spacing={4} wrap>
                        {[
                            { key: 'all', label: '全部', n: orders.length },
                            { key: 'wait', label: '待提现', n: orderCnt('wait') },
                            { key: 'merged', label: '已并入提现单', n: orderCnt('merged') },
                            { key: 'arrived', label: '已到账', n: orderCnt('arrived') },
                            { key: 'closed', label: '已关闭', n: orderCnt('closed') },
                        ]
                            .filter((t) => t.key === 'all' || t.n > 0)
                            .map((t) => (
                                <Button
                                    key={t.key}
                                    size="small"
                                    theme={orderState === t.key ? 'solid' : 'borderless'}
                                    type={orderState === t.key ? 'primary' : 'tertiary'}
                                    onClick={() => setOrderState(t.key)}
                                >
                                    {t.label} {t.n}
                                </Button>
                            ))}
                    </Space>
                </div>
            )}

            <SearchToolbar
                tools={tab === 'pend' ? pendSettings : orderSettings}
                onSearch={search}
                onReset={reset}
                onRefresh={() => void (tab === 'pend' ? refetchPend() : refetchOrder())}
                refreshing={tab === 'pend' ? loadingPend : loadingOrder}
                conditions={conditions}
                advanced={
                    <SearchField label="关键字">
                        <Input
                            value={draftQ}
                            onChange={setDraftQ}
                            onEnterPress={search}
                            showClear
                            placeholder="提现单 / 订单号 / 卖家 / 到账账户 / 流水号"
                        />
                    </SearchField>
                }
            >
                <Input
                    value={draftQ}
                    onChange={setDraftQ}
                    onEnterPress={search}
                    showClear
                    placeholder="提现单 / 订单号 / 卖家 / 到账账户 / 流水号"
                    style={{ width: 300 }}
                />
            </SearchToolbar>

            <div className="biz-dim" style={{ fontSize: 12, margin: '8px 0' }}>
                共 <b>{tab === 'pend' ? pendList.length : orderList.length}</b> / {tab === 'pend' ? pends.length : orders.length} 笔
                {freezeMin > 0 ? ` · 冻结时长取自「收付规则」：${freezeMin} 分钟` : ''}
            </div>

            {tab === 'pend' ? (
                <Table<BizPendWdView>
                    {...tableProps}
                    rowKey="code"
                    columns={pendTableColumns}
                    dataSource={pendList}
                    loading={loadingPend}
                    scroll={{ x: tableScrollX(pendTableColumns) }}
                    pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
                />
            ) : (
                <Table<BizWithdrawalView>
                    {...tableProps}
                    rowKey="code"
                    columns={orderTableColumns}
                    dataSource={orderList}
                    loading={loadingOrder}
                    scroll={{ x: tableScrollX(orderTableColumns) }}
                    pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
                />
            )}

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                合并提现单 = <b>一次「全部提现」的产物</b>：明细里逐笔记着哪几笔订单货款、哪几笔推广奖励，<b>金额恒等于明细之和</b>。
                它不是订单提现单的上级或下级，而是同一条出款的两种粒度 —— 从订单提现页的「所属提现单」也能跳到这里。
                <br />
                <b>失败由卖家在 C 端改账号重提；异常只能人工核</b>（核实未出款 → 转失败 / 线下打款 → 已到账）。
            </div>

            {reviewOf ? <ReviewModal record={reviewOf} freezeMin={freezeMin} onClose={() => setReviewOf(null)} /> : null}
            {disposeOf ? <DisposeModal record={disposeOf} onClose={() => setDisposeOf(null)} /> : null}
            {pendDetail ? <PendDetailModal record={pendDetail} onClose={() => setPendDetail(null)} /> : null}
            {orderDetail ? <OrderWdDetailModal record={orderDetail} onClose={() => setOrderDetail(null)} /> : null}
        </PageContainer>
    );
}
