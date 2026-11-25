import { Button, Input, Modal, Select, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { SearchToolbar } from '@/components/SearchToolbar';
import { useActionsColumn } from '@/components/TableActions';
import {
    ACCT_TYPES,
    acctBadText,
    acctCanOnline,
    acctMask,
    acctOk,
    acctTypeName,
    acctTypeOf,
} from '@/biz/biz-dict';
import { useBizCreate, useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { AcctTypeKey, BizAccountView, BizChannelView, BizPayoutAccountView } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { BizToneTag, Cell, KpiRow, StatRules } from '../shared';

/**
 * 账户管理：全站唯一的账户台账。
 *
 * 一条 = 一个公司主体 × 一个类型 × 一个结算账户。出款账户与收款渠道都从这里选账户，
 * 不再各自填主体与卡号 —— 同一个人在两处各维护一遍，改了一处忘另一处时，
 * 出款单上的户名与实际到账的卡就对不上。
 *
 * 类型不做成一条记录里的多选，三条原因：不同类型的「结算账户」不是同一种东西
 * （商户号 / 账号 / 卡号）；「正常 / 冻结」必须能按条控制（微信被冻结不该连带支付宝）；
 * 出款 / 收款的下拉选的就是某一条具体账户。
 */

/** 账户被引用的处数：停用或改动前要能回答「动了会怎样」 */
function useRefs(): (code: string) => { payout: number; channel: number; n: number } {
    const { data: payouts = [] } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');
    const { data: channels = [] } = useBizRows<BizChannelView>('bizChannel');
    return useMemo(
        () => (code: string) => {
            const payout = payouts.filter((p) => p.acct === code).length;
            const channel = channels.filter((c) => c.acct === code).length;
            return { payout, channel, n: payout + channel };
        },
        [payouts, channels],
    );
}

/** 账户选择器的展示文案：主体 · 类型 · 账号脱敏，异常的直接标出来 */
export function acctOptionLabel(a: BizAccountView): string {
    const bad = acctBadText(a);
    return `${a.subject} · ${acctTypeName(a.type)} · ${acctMask(a.acct)}${bad ? `（${bad}）` : ''}`;
}

function AccountFormModal({ record, onClose }: { record: BizAccountView | null; onClose: () => void }) {
    const create = useBizCreate<BizAccountView>('bizAccount');
    const update = useBizUpdate<BizAccountView>('bizAccount');
    const refs = useRefs();
    const lock = record !== null;
    const used = record ? refs(record.code).n : 0;
    /** 已被引用就不能改类型：改了等于换一个账户，历史单据解释不清当时用的是哪个号 */
    const typeLocked = lock && used > 0;

    const [subject, setSubject] = useState(record?.subject ?? '');
    const [type, setType] = useState<AcctTypeKey>(record?.type ?? 'bank');
    const [bank, setBank] = useState(record?.bank ?? '');
    const [acct, setAcct] = useState(record?.acct ?? '');
    const [normal, setNormal] = useState(record?.normal ?? true);
    const [frozen, setFrozen] = useState(record?.frozen ?? false);
    const [note, setNote] = useState(record?.note ?? '');

    const needBank = Boolean(acctTypeOf(type)?.bank);

    const submit = () => {
        if (!subject.trim()) {
            Toast.warning('公司主体要填营业执照全称');
            return;
        }
        if (!acct.trim()) {
            Toast.warning('结算账户要填');
            return;
        }
        if (needBank && !bank.trim()) {
            Toast.warning('银行卡要填银行名称（写到支行），否则退款时找不到是哪个户');
            return;
        }
        const body: Partial<BizAccountView> = {
            subject: subject.trim(),
            type,
            bank: needBank ? bank.trim() : '',
            acct: acct.trim(),
            normal,
            frozen,
            note: note.trim(),
        };
        const done = () => {
            Toast.success(lock ? '已保存' : '已新增，立刻出现在出款账户与收款渠道的下拉里');
            onClose();
        };
        if (lock) {
            update.mutate({ id: record.id, body }, { onSuccess: done });
        } else {
            const p = (n: number) => String(n).padStart(2, '0');
            const d = new Date();
            create.mutate(
                {
                    ...body,
                    code: '',
                    at: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
                },
                { onSuccess: done },
            );
        }
    };

    return (
        <Modal
            title={lock ? `编辑账户 · ${record.code}` : '新增账户'}
            visible
            width={680}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={create.isPending || update.isPending} onClick={submit}>
                        {lock ? '保存' : '新增'}
                    </Button>
                </Space>
            }
        >
            <div className="biz-calc" style={{ marginBottom: 12 }}>
                {lock ? (
                    <>
                        <b>{acctTypeName(record.type)}</b> · 被 {refs(record.code).payout} 条出款 /{' '}
                        {refs(record.code).channel} 条收款引用。
                        {typeLocked ? '已被引用，类型锁定 —— 要换请新建一条。' : '还没有被引用，类型仍可改。'}
                    </>
                ) : (
                    <>一条 = 一个主体 × 一个类型 × 一个结算账户；同一主体下每种类型各建一条。</>
                )}
            </div>

            <Field label="公司主体" hint="写营业执照全称；同一主体下可以有多种类型（各一条）">
                <Input value={subject} onChange={setSubject} placeholder="如 示例商贸有限公司" />
            </Field>

            <div className="biz-form-grid">
                <Field
                    label={`类型${typeLocked ? '（不可修改）' : ''}`}
                    hint={typeLocked ? '已被引用，改了等于换一个账户' : '只有微信 / 支付宝 / 银行卡能选线上；其余类型固定走线下'}
                >
                    <Select
                        value={type}
                        disabled={typeLocked}
                        onChange={(v) => setType(v as AcctTypeKey)}
                        style={{ width: '100%' }}
                        optionList={ACCT_TYPES.map((t) => ({ label: t.t, value: t.k }))}
                    />
                </Field>
                {needBank ? (
                    <Field label="银行名称（写到支行）" hint="只写「招商银行」退款时找不到是哪个户">
                        <Input value={bank} onChange={setBank} placeholder="如 招商银行 杭州分行营业部" />
                    </Field>
                ) : null}
            </div>

            <Field label="结算账户" hint="银行卡号 / 支付宝账号 / 微信商户号 / 店铺账号；列表里只显示前 2 位与后 4 位">
                <Input value={acct} onChange={setAcct} placeholder="6225880123456789" />
            </Field>

            <div className="biz-section-title">状态（两个独立开关）</div>
            <div className="biz-form-grid">
                <Field label="是否正常" hint="资质复核中 / 资料不全时关掉，即置为「异常」。异常后引用它的一律停用">
                    <Select
                        value={normal ? 'ok' : 'bad'}
                        onChange={(v) => setNormal(v === 'ok')}
                        style={{ width: '100%' }}
                        optionList={[
                            { label: '正常', value: 'ok' },
                            { label: '异常', value: 'bad' },
                        ]}
                    />
                </Field>
                <Field label="是否冻结" hint="被渠道风控冻结时打开。它和「异常」是两回事，可以同时成立">
                    <Select
                        value={frozen ? 'yes' : 'no'}
                        onChange={(v) => setFrozen(v === 'yes')}
                        style={{ width: '100%' }}
                        optionList={[
                            { label: '未冻结', value: 'no' },
                            { label: '已冻结', value: 'yes' },
                        ]}
                    />
                </Field>
            </div>
            <div className={`biz-calc${acctOk({ normal, frozen }) ? '' : ' biz-calc--bad'}`}>
                {acctOk({ normal, frozen })
                    ? '这个账户可用 —— 引用它的出款账户与收款渠道能正常收付。'
                    : `不可用（${acctBadText({ normal, frozen })}）：引用它的出款账户立刻出不了款、收款渠道立刻收不了钱，不需要再去别处关一次。`}
            </div>

            <Field label="备注（选填，只给后台看）">
                <Input value={note} onChange={setNote} placeholder="如 总部对公主账户 / 2026-11-14 被风控冻结" />
            </Field>

            {lock ? null : (
                <div className="biz-calc">
                    新增后立刻出现在出款账户与收款渠道的账户下拉里。<b>本页不选线上 / 线下</b> ——
                    同一张卡既能线上走通道、也能线下人工转账，方式在引用它的那一刻按用途选。
                </div>
            )}
        </Modal>
    );
}

export default function AccountsPage() {
    const { data = [], isFetching } = useBizRows<BizAccountView>('bizAccount');
    const update = useBizUpdate<BizAccountView>('bizAccount');
    const refs = useRefs();
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const [editing, setEditing] = useState<BizAccountView | null | undefined>(undefined);
    const [draftType, setDraftType] = useState<string | undefined>(undefined);
    const [draftQ, setDraftQ] = useState('');
    const [type, setType] = useState<string | undefined>(undefined);
    const [q, setQ] = useState('');

    const okN = data.filter(acctOk).length;
    const frozenN = data.filter((a) => a.frozen).length;
    const badN = data.filter((a) => !a.normal).length;

    /** 状态是运行态，点一下即生效 —— 改了要写进审计，事后有人问「那天为什么打款失败」 */
    const toggle = (a: BizAccountView, field: 'normal' | 'frozen') => {
        const next = !a[field];
        update.mutate(
            { id: a.id, body: { [field]: next } },
            {
                onSuccess: () =>
                    Toast.success(
                        field === 'normal'
                            ? `${a.code} 已置为${next ? '正常' : '异常'}`
                            : `${a.code} 已${next ? '冻结' : '解冻'}`,
                    ),
            },
        );
    };

    const rows = useMemo(() => {
        const kw = q.trim().toLowerCase();
        return data.filter((a) => {
            if (type && a.type !== type) return false;
            if (!kw) return true;
            return `${a.code} ${a.subject} ${a.acct} ${a.bank}`.toLowerCase().includes(kw);
        });
    }, [data, type, q]);

    const columns: ColumnProps<BizAccountView>[] = [
        {
            title: '编号',
            dataIndex: 'code',
            width: 120,
            render: (v: string, a: BizAccountView) => <Cell main={<b className="biz-mono">{v}</b>} sub={`登记 ${a.at || '—'}`} />,
        },
        {
            title: '公司主体',
            dataIndex: 'subject',
            width: 240,
            render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span>,
        },
        {
            title: '类型',
            dataIndex: 'type',
            width: 100,
            render: (v: string) => {
                const t = acctTypeOf(v);
                return <BizToneTag tone={t?.tone ?? 'neutral'}>{t?.t ?? v}</BizToneTag>;
            },
        },
        {
            title: '银行名称',
            dataIndex: 'bank',
            width: 200,
            render: (v: string) => <span className="biz-cell__sub">{v || '—'}</span>,
        },
        {
            title: '结算账户',
            dataIndex: 'acct',
            width: 150,
            render: (v: string) => (
                <span className="biz-mono">{acctMask(v)}</span>
            ),
        },
        {
            title: '状态（点一下切换）',
            dataIndex: 'normal',
            width: 180,
            render: (_: unknown, a: BizAccountView) => (
                <Space spacing={4}>
                    <Button
                        size="small"
                        theme={a.normal ? 'borderless' : 'solid'}
                        type={a.normal ? 'tertiary' : 'warning'}
                        onClick={() => toggle(a, 'normal')}
                    >
                        {a.normal ? '正常' : '异常'}
                    </Button>
                    <Button
                        size="small"
                        theme={a.frozen ? 'solid' : 'borderless'}
                        type={a.frozen ? 'danger' : 'tertiary'}
                        onClick={() => toggle(a, 'frozen')}
                    >
                        {a.frozen ? '冻结' : '未冻结'}
                    </Button>
                </Space>
            ),
        },
        {
            title: '被引用',
            key: 'refs',
            dataIndex: 'code',
            width: 110,
            render: (v: string) => {
                const u = refs(v);
                return <Cell main={<span className="biz-num">{u.n}</span>} sub={`出款 ${u.payout} / 收款 ${u.channel}`} />;
            },
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 76 },
    ];

    const actionsOf = (a: BizAccountView) => [{ key: 'edit', label: '编辑', onClick: () => setEditing(a) }];
    const { columns: tableColumns } = useActionsColumn(columns, actionsOf);

    return (
        <PageContainer
            title="账户管理"
            extra={
                <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                    ＋ 新增账户
                </Button>
            }
        >
            <KpiRow
                items={[
                    {
                        label: '账户',
                        value: data.length,
                        unit: '条',
                        desc: `${new Set(data.map((a) => a.subject)).size} 个主体 · ${new Set(data.map((a) => a.type)).size} 种类型`,
                    },
                    {
                        label: '可用',
                        value: okN,
                        unit: '条',
                        desc: '正常且未冻结 —— 只有这些能真的收付',
                    },
                    {
                        label: '已冻结',
                        value: frozenN,
                        unit: '条',
                        alert: frozenN > 0,
                        desc: frozenN ? '引用它的出款 / 收款立刻停' : '没有冻结',
                    },
                    {
                        label: '异常',
                        value: badN,
                        unit: '条',
                        alert: badN > 0,
                        desc: badN ? '资质复核 / 资料不全等，待处理' : '全部正常',
                    },
                ]}
            />
            <StatRules
                items={[
                    '<b>本页只负责一件事：这个账户是什么、它现在能不能用。</b>不在本页：出款账户的费率与凭证（「出款账户」）、收款渠道的费率限额与凭证（「收款商户」）、每个账户今天收了多少出了多少（「支付流水」「提现管理」）。',
                    '<b>一条记录 = 一个主体 × 一个类型 × 一个结算账户。</b>同一主体下每种类型各一条（微信一条、支付宝一条、银行卡可以有多张）。不把类型做成多选，三个原因：不同类型的「结算账户」根本不是同一个东西（商户号 / 账号 / 卡号）；「正常 / 冻结」必须能按条控制（微信被冻结不该连带支付宝）；出款 / 收款的下拉选的就是某一条具体账户。',
                    '<b>九个类型，只有微信 / 支付宝 / 银行卡能选「线上」。</b>其余六种（淘宝 / 得物 / 抖店 / 小红书 / 氪金联盟 / 京东）是平台店铺的收款账号，只能走线下 —— 它们没有线上收单接口。',
                    '<b>「是否正常」与「是否冻结」是两个独立开关，不是一个三态。</b>正常但冻结（渠道风控）、异常但没冻结（资质复核中）都是真实存在的状态，合成一个枚举就会丢掉其中一个。判断能不能用<b>只认两个都为真</b>。两者都不可用时处理方式不同：异常要补资料，冻结要申诉。',
                    '<b>异常 / 冻结只关线上、不动线下，而且不会自己开回来。</b>切到异常或冻结那一刻，引用它的<b>线上</b>收款渠道与<b>线上</b>出款账户被自动置为关闭；账户恢复正常后这些开关<b>保持关闭</b>，要人工重新打开 —— 风控刚解除就自动接单 / 自动出款，比这一路空几天贵得多。',
                    '<b>已被引用的账户不能改类型。</b>类型决定它走线上还是线下、配哪套凭证、进哪个分流池；改了等于换一个账户，而历史单据还按原来的名字记着。要换请新建一条。',
                    '<b>不提供删除。</b>账户会被历史流水、退款、结算单指向；删了它们就变成一个空值，对账表上会出现一行没有归属的钱。停用走两个开关，随时可恢复。',
                ]}
            />
            <SearchToolbar
                onSearch={() => {
                    setType(draftType);
                    setQ(draftQ);
                }}
                onReset={() => {
                    setDraftType(undefined);
                    setDraftQ('');
                    setType(undefined);
                    setQ('');
                }}
            >
                <Select
                    placeholder="全部类型"
                    value={draftType}
                    onChange={(v) => setDraftType(v ? String(v) : undefined)}
                    optionList={ACCT_TYPES.filter((t) => data.some((a) => a.type === t.k)).map((t) => ({
                        label: `${t.t}（${data.filter((a) => a.type === t.k).length}）`,
                        value: t.k,
                    }))}
                    showClear
                    style={{ width: 170 }}
                />
                <Input
                    placeholder="编号 / 公司主体 / 账户号 / 银行名称"
                    value={draftQ}
                    onChange={setDraftQ}
                    onEnterPress={() => {
                        setType(draftType);
                        setQ(draftQ);
                    }}
                    showClear
                    style={{ width: 280 }}
                />
            </SearchToolbar>

            <Table<BizAccountView>
                {...tableProps}
                rowKey="code"
                columns={tableColumns}
                dataSource={rows}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>账户是「钱进谁、从哪个号走」的唯一登记处。</b>出款账户选它、收款渠道也选它 ——
                同一个人在两处各维护一遍，改了一处忘另一处时，出款单上的户名与实际到账的卡就对不上了。
                <br />
                <b>线上 / 线下不是这一页的字段。</b>同一张卡既能线上走通道、也能线下人工转账，
                所以「方式」放在引用它的地方（出款账户 / 收款渠道）按用途选；这一页只回答「这个账户是什么、能不能用」。
                <br />
                <b>银行名称只在类型是银行卡时出现，且必填、要写到支行。</b>只写「招商银行」退款时找不到是哪个户；
                其他类型没有「开户行」这个概念，留着只会让人以为该填点什么。
            </div>

            {editing !== undefined ? <AccountFormModal record={editing} onClose={() => setEditing(undefined)} /> : null}
        </PageContainer>
    );
}

/** 账户选择器的选项：供出款账户与收款渠道两个弹窗共用 */
export function useAccountOptions(): { label: string; value: string }[] {
    const { data = [] } = useBizRows<BizAccountView>('bizAccount');
    return data.map((a) => ({ label: acctOptionLabel(a), value: a.code }));
}

/** 账户能不能选线上：微信 / 支付宝 / 银行卡可以，其余固定线下 */
export function canOnline(accountType: string | undefined): boolean {
    return acctCanOnline(accountType ?? '');
}
