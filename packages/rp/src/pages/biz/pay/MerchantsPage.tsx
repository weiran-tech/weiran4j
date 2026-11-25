import { Banner, Button, Input, InputNumber, Modal, Select, Space, Switch, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { useActionsColumn } from '@/components/TableActions';
import {
    CYCLES,
    THIRDS,
    acctBadText,
    acctCanOnline,
    acctMask,
    acctOk,
    acctTypeName,
    dockOf,
    dockOfAccount,
    poolOfWay,
    wayName,
    waysFor,
} from '@/biz/biz-dict';
import { useBizCreate, useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizAccountView, BizChannelView, ChannelDock } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { BizToneTag, Cell } from '../shared';

/**
 * 收款商户：钱从哪条路进来。
 *
 * 2026-11-16 重构：删掉「收款主体」页签，主体搬到「账户管理」；渠道改为引用账户。
 * 主体页签原来只做一件事（被渠道选中），而账户那一条已经带着主体与结算账户 ——
 * 删掉之后这一页只剩渠道，也不用再回答「没有主体时渠道页该显示什么」。
 *
 * 一条渠道 = 一个账户 × 一种方式 × 一个支付方式 × 一种收款方式。
 * 微信与支付宝仍要分两条（两边的费率 / 限额 / 开放时间可以不同）。
 */

/** 账户类型 → 支付方式：微信账户只收微信，支付宝账户只收支付宝，其余走自身 */
function payGroupOfType(type: string): 'wx' | 'ali' | 'solo' {
    if (type === 'wx') return 'wx';
    if (type === 'ali') return 'ali';
    return 'solo';
}

function ChannelFormModal({
    record,
    accounts,
    onClose,
}: {
    record: BizChannelView | null;
    accounts: BizAccountView[];
    onClose: () => void;
}) {
    const create = useBizCreate<BizChannelView>('bizChannel');
    const update = useBizUpdate<BizChannelView>('bizChannel');
    const lock = record !== null;

    const [alias, setAlias] = useState(record?.alias ?? '');
    const [acctCode, setAcctCode] = useState(record?.acct ?? '');
    const [online, setOnline] = useState(record?.online ?? true);
    const [third, setThird] = useState(record?.third ?? THIRDS[0] ?? '');
    const [way, setWay] = useState(record?.ways?.[0] ?? '');
    const [rate, setRate] = useState<number>(record?.rate ?? 6);
    const [cycle, setCycle] = useState(record?.cycle ?? 'T1');
    const [singleLimit, setSingleLimit] = useState<number>(record?.singleLimit ?? 50000);
    const [dayLimit, setDayLimit] = useState<number>(record?.dayLimit ?? 200000);
    const [openFrom, setOpenFrom] = useState(record?.openFrom ?? '00:00:00');
    const [openTo, setOpenTo] = useState(record?.openTo ?? '23:59:59');
    const [note, setNote] = useState(record?.note ?? '');

    const account = accounts.find((a) => a.code === acctCode);
    const type = account?.type ?? '';
    const canOnline = acctCanOnline(type);
    // 其余类型固定线下，置灰不可变更
    const effectiveOnline = canOnline ? online : false;
    const dock: ChannelDock = dockOfAccount(type, effectiveOnline, third);
    const group = payGroupOfType(type);
    /** 三方名称只在微信 / 支付宝的线上渠道出现 */
    const needThird = effectiveOnline && (group === 'wx' || group === 'ali');

    const availWays = useMemo(() => {
        if (!account) return [];
        if (!effectiveOnline) return waysFor('bank').filter(() => true);
        if (group === 'solo') return waysFor(type);
        return waysFor('third').filter((w) => w.g === group);
    }, [account, effectiveOnline, group, type]);

    // 换账户后原来的收款方式可能不再适用，落到第一个
    const wayValue = availWays.some((w) => w.k === way) ? way : (availWays[0]?.k ?? '');

    const submit = () => {
        if (!alias.trim()) {
            Toast.warning('别名必填（3–8 字，保存后不可修改）');
            return;
        }
        if (!account) {
            Toast.warning('要先选一个账户');
            return;
        }
        if (effectiveOnline && !wayValue) {
            Toast.warning('线上渠道要选一种收款方式');
            return;
        }
        if (effectiveOnline && group !== 'solo' && rate <= 0) {
            Toast.warning('线上微信 / 支付宝的基础费率必须大于 0');
            return;
        }
        const body: Partial<BizChannelView> = {
            alias: alias.trim(),
            acct: acctCode,
            online: effectiveOnline,
            dock,
            ...(needThird ? { third } : {}),
            ways: effectiveOnline ? [wayValue] : ['bank'],
            rate,
            cycle,
            singleLimit,
            dayLimit,
            openFrom,
            openTo,
            note: note.trim(),
        };
        const done = () => {
            Toast.success(lock ? '已保存' : '已新增，默认未开启');
            onClose();
        };
        if (record) update.mutate({ id: record.id, body }, { onSuccess: done });
        else {
            const d = new Date();
            const p = (n: number) => String(n).padStart(2, '0');
            create.mutate(
                {
                    ...body,
                    code: '',
                    weight: 100,
                    on: false,
                    at: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
                },
                { onSuccess: done },
            );
        }
    };

    return (
        <Modal
            title={lock ? `编辑渠道 · ${record.alias}` : '新增收款渠道'}
            visible
            width={780}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={create.isPending || update.isPending} onClick={submit}>
                        保存
                    </Button>
                </Space>
            }
        >
            {!accounts.length ? (
                <Banner
                    type="warning"
                    closeIcon={null}
                    description="还没有任何账户，建不了收款渠道 —— 先到「收付管理 → 账户管理」建一条。"
                />
            ) : (
                <>
                    <div className="biz-form-grid">
                        <Field label={`别名（3–8 字）${lock ? ' · 保存后不可修改' : ''}`} hint="这条渠道在支付流水 / 对账里的名字">
                            <Input value={alias} onChange={setAlias} maxLength={8} disabled={lock} placeholder="如 汇付微信01" />
                        </Field>
                        <Field
                            label={`主体账户${lock ? ' · 不可修改' : ''}`}
                            hint="选项来自「账户管理」；选中后自动展示主体 / 卡名 / 结算账户 / 状态"
                        >
                            <Select
                                value={acctCode}
                                disabled={lock}
                                onChange={(v) => setAcctCode(String(v))}
                                style={{ width: '100%' }}
                                filter
                                optionList={accounts.map((a) => ({
                                    label: `${a.subject} · ${acctTypeName(a.type)} · ${acctMask(a.acct)}${acctBadText(a) ? `（${acctBadText(a)}）` : ''}`,
                                    value: a.code,
                                }))}
                                placeholder="选一条账户"
                            />
                        </Field>
                    </div>

                    {account ? (
                        <div className={`biz-calc${acctOk(account) ? '' : ' biz-calc--bad'}`}>
                            <b>{account.subject}</b> · {acctTypeName(account.type)}
                            {account.bank ? ` · ${account.bank}` : ''} ·{' '}
                            <span className="biz-mono">{acctMask(account.acct)}</span>
                            {'　'}
                            {acctOk(account) ? (
                                <BizToneTag tone="ok">正常 · 未冻结</BizToneTag>
                            ) : (
                                <BizToneTag tone="danger">{acctBadText(account)}</BizToneTag>
                            )}
                            {acctOk(account) ? null : <div style={{ marginTop: 4 }}>账户{acctBadText(account)}：开关打开也收不了钱。</div>}
                        </div>
                    ) : null}

                    <div className="biz-form-grid">
                        <Field
                            label="方式"
                            hint={
                                canOnline
                                    ? '线上走通道收款；线下由买家转账给商户，财务人工核销'
                                    : `${acctTypeName(type) || '这个类型'}固定线下，不可变更`
                            }
                        >
                            <Select
                                value={effectiveOnline ? 'online' : 'offline'}
                                disabled={!canOnline}
                                onChange={(v) => setOnline(v === 'online')}
                                style={{ width: '100%' }}
                                optionList={[
                                    { label: '线上（走通道，要配凭证）', value: 'online' },
                                    { label: '线下（人工核销，不要凭证）', value: 'offline' },
                                ]}
                            />
                        </Field>
                        <Field
                            label="对接类型"
                            hint="由「账户类型 + 方式 + 三方名称」推出，不再由人选 —— 存两份会在换账户时对不上"
                        >
                            <Input
                                value={`${dockOf(dock)?.t ?? dock}${needThird ? ` · ${third}` : ''}`}
                                disabled
                                style={{ width: '100%' }}
                            />
                        </Field>
                    </div>

                    {needThird ? (
                        <Field label={`三方名称${lock ? ' · 不可修改' : ''}`} hint="汇付天下 / 通联支付 / 直连三档">
                            <Select
                                value={third}
                                disabled={lock}
                                onChange={(v) => setThird(String(v))}
                                style={{ width: '100%' }}
                                optionList={[
                                    { label: '汇付天下', value: '汇付天下' },
                                    { label: '通联支付', value: '通联支付' },
                                    { label: '直连', value: '直连' },
                                ]}
                            />
                        </Field>
                    ) : null}

                    {effectiveOnline ? (
                        <>
                            <div className="biz-section-title">收款方式</div>
                            <Field label="收款方式" hint="一条渠道只有一种收款方式">
                                <Select
                                    value={wayValue}
                                    onChange={(v) => setWay(String(v))}
                                    style={{ width: '100%' }}
                                    optionList={availWays.map((w) => ({ label: `${w.t} — ${w.scene}`, value: w.k }))}
                                />
                            </Field>
                        </>
                    ) : (
                        <div className="biz-calc">
                            <b>线下渠道只登记参数。</b>不选收款方式、不要凭证、不进任何分流池（不过收银台）——
                            下面几项全部选填，一项都不填也存得下去。
                        </div>
                    )}

                    <div className="biz-form-grid biz-form-grid--3">
                        <Field label="费率（‰）" hint={effectiveOnline && group !== 'solo' ? '线上微信 / 支付宝必须 > 0' : '线下可为 0'}>
                            <InputNumber
                                value={rate}
                                min={0}
                                max={100}
                                precision={2}
                                style={{ width: '100%' }}
                                onChange={(v) => setRate(typeof v === 'number' ? v : 0)}
                            />
                        </Field>
                        <Field label="结算规则" hint="只有 T1 / D1 / D0 / S0，没有 T3；线下允许不指定">
                            <Select
                                value={cycle}
                                onChange={(v) => setCycle(String(v))}
                                style={{ width: '100%' }}
                                optionList={CYCLES.map((c) => ({ label: `${c.k} · ${c.d}`, value: c.k }))}
                            />
                        </Field>
                        <Field label="开放时间" hint="全天 = 00:00:00–23:59:59">
                            <Space>
                                <Input value={openFrom} onChange={setOpenFrom} style={{ width: 96 }} />
                                <span className="biz-dim">—</span>
                                <Input value={openTo} onChange={setOpenTo} style={{ width: 96 }} />
                            </Space>
                        </Field>
                    </div>
                    <div className="biz-form-grid">
                        <Field label="单笔限额（元）" hint="0 = 不限额">
                            <InputNumber
                                value={singleLimit}
                                min={0}
                                precision={0}
                                style={{ width: '100%' }}
                                onChange={(v) => setSingleLimit(typeof v === 'number' ? v : 0)}
                            />
                        </Field>
                        <Field label="日限额（元）" hint="0 = 不限额">
                            <InputNumber
                                value={dayLimit}
                                min={0}
                                precision={0}
                                style={{ width: '100%' }}
                                onChange={(v) => setDayLimit(typeof v === 'number' ? v : 0)}
                            />
                        </Field>
                    </div>
                    <Field label="备注（只给后台看）">
                        <Input value={note} onChange={setNote} placeholder="如 主站微信 · 公众号网页" />
                    </Field>
                    <div className="biz-calc">
                        开关不在这个弹窗里：列表上那个「账号交易开关」才是这条渠道收不收。这里只登记参数 ——
                        号没填对，打开开关也收不到钱。
                    </div>
                </>
            )}
        </Modal>
    );
}

/* ---------- 页面 ---------- */

export default function MerchantsPage() {
    const [channelEditing, setChannelEditing] = useState<BizChannelView | null | undefined>(undefined);
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const { data: channels = [], isFetching: loadingCh } = useBizRows<BizChannelView>('bizChannel');
    const updateCh = useBizUpdate<BizChannelView>('bizChannel');

    const acctOf = useMemo(() => (code: string) => accounts.find((a) => a.code === code), [accounts]);
    /**
     * 渠道真的在收钱：开关开着，且**线上渠道**引用的账户正常未冻结。
     * 线下渠道走人工转账 / 平台店铺走款，不看渠道健康度 —— 账户异常不该把线下也停掉。
     */
    const channelOn = (c: BizChannelView) =>
        c.on && (!c.online || acctOk(acctOf(c.acct) ?? { normal: true, frozen: false }));

    /* 池：流水线按支付方式分；只有「开着」的渠道进池。线下渠道不进任何池 */
    const poolChannels = (pool: string) =>
        channels.filter((c) => channelOn(c) && c.online && c.ways.some((w) => poolOfWay(w) === pool));
    const shareOf = (c: BizChannelView, pool: string) => {
        const list = poolChannels(pool);
        const sum = list.reduce((s, x) => s + (Number(x.weight) || 0), 0);
        if (!sum) return 0;
        return Math.round(((Number(c.weight) || 0) / sum) * 100);
    };

    const chColumns: ColumnProps<BizChannelView>[] = [
        {
            title: '别名',
            dataIndex: 'alias',
            width: 140,
            render: (v: string, r: BizChannelView) => <Cell main={<b style={{ fontWeight: 600 }}>{v}</b>} sub={r.code} />,
        },
        {
            title: '账户',
            dataIndex: 'acct',
            width: 210,
            render: (_: unknown, r: BizChannelView) => {
                const acct = acctOf(r.acct);
                const bad = acct ? acctBadText(acct) : '账户不存在';
                return (
                    <Cell
                        main={
                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <BizToneTag tone={r.dock === 'offline' ? 'neutral' : 'brand'}>
                                    {acctTypeName(acct?.type ?? '')}
                                </BizToneTag>
                                <span className="biz-mono">{acctMask(acct?.acct ?? '')}</span>
                                {bad ? <BizToneTag tone="danger">{bad}</BizToneTag> : null}
                            </span>
                        }
                        sub={acct?.bank || undefined}
                    />
                );
            },
        },
        {
            title: '公司主体',
            key: 'subject',
            dataIndex: 'acct',
            width: 220,
            render: (_: unknown, r: BizChannelView) => (
                <span style={{ fontSize: 12 }}>{acctOf(r.acct)?.subject ?? '—'}</span>
            ),
        },
        {
            title: '方式',
            dataIndex: 'online',
            width: 78,
            render: (v: boolean) =>
                v ? <BizToneTag tone="brand">线上</BizToneTag> : <BizToneTag tone="neutral">线下</BizToneTag>,
        },
        {
            title: '三方名称',
            dataIndex: 'third',
            width: 118,
            render: (v: string, r: BizChannelView) =>
                r.online && (r.dock === 'third' || r.dock === 'wx' || r.dock === 'ali') && v ? (
                    <span style={{ fontSize: 12 }}>{v}</span>
                ) : (
                    <span className="biz-dim">—</span>
                ),
        },
        {
            title: '支付方式',
            dataIndex: 'ways',
            width: 100,
            render: (_: unknown, r: BizChannelView) => {
                if (r.dock === 'offline') return <span className="biz-dim">自身</span>;
                const g = r.ways[0] ? waysFor(r.dock).find((w) => w.k === r.ways[0])?.g : undefined;
                if (!g) return <span className="biz-dim">—</span>;
                if (g === 'solo') return <span className="biz-dim">自身</span>;
                return <BizToneTag tone={g === 'wx' ? 'ok' : 'brand'}>{g === 'wx' ? '微信' : '支付宝'}</BizToneTag>;
            },
        },
        {
            title: '收款方式',
            key: 'way',
            dataIndex: 'ways',
            width: 140,
            render: (_: unknown, r: BizChannelView) =>
                r.dock === 'offline' ? <span className="biz-dim">—</span> : <span style={{ fontSize: 12 }}>{wayName(r.ways[0] ?? '')}</span>,
        },
        {
            title: '费率 / 账期',
            dataIndex: 'rate',
            width: 130,
            align: 'right',
            render: (_: unknown, r: BizChannelView) => (
                <Cell
                    main={<span className="biz-num" style={{ fontWeight: 650 }}>{r.rate}‰</span>}
                    sub={`${r.cycle} · 单笔 ${r.singleLimit || '不限'} · 日 ${r.dayLimit || '不限'}`}
                />
            ),
        },
        {
            title: '分流权重',
            dataIndex: 'weight',
            width: 96,
            align: 'center',
            render: (_: unknown, r: BizChannelView) => {
                if (r.dock === 'offline') return <span className="biz-dim">不进池</span>;
                if (!channelOn(r)) return <span className="biz-dim">—</span>;
                const pools = [...new Set(r.ways.map((w) => poolOfWay(w)))].filter(Boolean);
                const multi = pools.filter((p) => poolChannels(p).length > 1);
                if (!multi.length) return <span className="biz-dim" title="池里只有它一条，100% 走它">独占</span>;
                const first = multi[0] ?? '';
                return (
                    <Cell
                        main={<span className="biz-num">{r.weight}</span>}
                        sub={`${shareOf(r, first)}% · ${first === 'wx' ? '微信' : '支付宝'}池`}
                    />
                );
            },
        },
        {
            title: '账号交易开关',
            dataIndex: 'on',
            width: 116,
            align: 'center',
            render: (_: unknown, r: BizChannelView) => {
                const acct = acctOf(r.acct);
                const bad = acct ? acctBadText(acct) : '账户不存在';
                // 线上渠道靠渠道凭证收款，主体异常 / 冻结时钱收不进来 —— 直接不让开
                const locked = !r.on && r.online && Boolean(bad);
                return (
                    <Cell
                        main={
                            <Switch
                                checked={r.on}
                                size="small"
                                disabled={locked}
                                onChange={(v) => {
                                    if (v && locked) {
                                        Toast.error(`主体${bad}，不能开启 —— 先到「账户管理」恢复正常或解冻`);
                                        return;
                                    }
                                    updateCh.mutate(
                                        { id: r.id, body: { on: v } },
                                        {
                                            onSuccess: () =>
                                                Toast.success(
                                                    v
                                                        ? `${r.alias} 已开启${r.online ? '，自动进分流池' : '（线下，不进池）'}`
                                                        : `${r.alias} 已关闭`,
                                                ),
                                        },
                                    );
                                }}
                            />
                        }
                        // 线下渠道不受账户状态影响，不标红
                        sub={locked ? `主体${bad}，不可开启` : r.online && bad ? `主体${bad}` : undefined}
                        subDanger={locked || (r.online && Boolean(bad))}
                    />
                );
            },
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 76 },
    ];

    const { columns: chSettled, columnSettings: chSettings } = useColumnSettings('biz/merchants-channel', chColumns);
    const { columns: chTableColumns } = useActionsColumn(chSettled, (r) => [
        { key: 'edit', label: '编辑', onClick: () => setChannelEditing(r) },
    ]);

    const broken = channels.filter((c) => c.on && c.online && !acctOk(acctOf(c.acct) ?? { normal: true, frozen: false }));

    return (
        <PageContainer
            title="收款商户"
            extra={
                <Space>
                    {chSettings}
                    <Button type="primary" theme="solid" disabled={!accounts.length} onClick={() => setChannelEditing(null)}>
                        ＋ 新增渠道
                    </Button>
                </Space>
            }
        >
            {!accounts.length ? (
                <div className="biz-calc" style={{ marginBottom: 12 }}>
                    <b>还没有任何账户，建不了收款渠道。</b>先到「收付管理 → 账户管理」建一条账户 ——
                    主体与结算账户都在那一条上，渠道只引用它。
                </div>
            ) : null}

            {broken.length ? (
                <div className="biz-calc biz-calc--bad" style={{ marginBottom: 12 }}>
                    <b>{broken.map((c) => c.alias).join('、')} 开关开着，但主体异常 / 冻结</b> ——
                    这几条线上渠道现在收不了钱。主体一旦被置为异常或冻结，开关会自动关闭；
                    恢复正常后重新打开即可。<b>线下渠道不受影响</b>。
                </div>
            ) : null}

            <Table<BizChannelView>
                {...tableProps}
                rowKey="code"
                columns={chTableColumns}
                dataSource={channels}
                loading={loadingCh}
                scroll={{ x: tableScrollX(chTableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>这一页只管「从哪条路收钱」。</b>不在这一页：账户本身的登记与状态（「账户管理」）、钱怎么出去（「出款账户」「提现规则」）、
                交易手续费与包赔费（「交易规则」）、渠道之间的分流权重（「路由分流」，本页只显示每一路在池里的占比）。
                <br />
                <b>一条渠道 = 一个账户 × 一种方式 × 一个支付方式 × 一种收款方式。</b>
                微信与支付宝不能挂在同一条渠道上 —— 两边的费率、单笔限额、日限额、开放时间可以完全不同，
                一条渠道只存得下一套。同一个三方同时接了两家，就建两条渠道。
                <br />
                <b>「对接类型」不再由人选，由「账户类型 + 方式 + 三方名称」推出来。</b>
                线下 → 线下；微信 / 支付宝 + 直连 → 对应直连；微信 / 支付宝 + 三方 → 三方；银行卡 → 银行卡。
                少一道选择题，也少两种自相矛盾的组合（比如「支付宝账户 + 微信对接类型」）。
                <br />
                <b>账户必须先于渠道存在。</b>账户要核营业执照与对公账户，是需要财务确认的动作 ——
                让渠道弹窗顺手建一个账户，等于允许运营替财务决定钱进谁账。
                <br />
                <b>「已开」才是真的在收。</b>关掉的渠道仍在台账里，C 端不再出现它承载的方式，也会退出「路由分流」的池子。
                <br />
                <b>线下渠道不进任何分流池</b>：不过收银台，只登记费率、限额与开放时间，钱由买家转账、财务人工核销。
                <br />
                <b>线上渠道：账户异常 / 冻结时开关点不动、已开的自动关闭，恢复后不自动开回来。</b>
                线上渠道要调的是那条账户的收单接口，账户不可用时开着它只会在收款那一刻失败。
                <b>线下渠道不看账户状态</b> —— 它不过收银台，钱是买家线下打进来的。
            </div>

            {channelEditing !== undefined ? (
                <ChannelFormModal record={channelEditing} accounts={accounts} onClose={() => setChannelEditing(undefined)} />
            ) : null}
        </PageContainer>
    );
}
