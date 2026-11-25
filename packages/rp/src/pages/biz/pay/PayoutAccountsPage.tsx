import { Button, Input, InputNumber, Modal, Select, Space, Table, Toast } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import { useMemo, useState } from 'react';
import { useColumnSettings } from '@/components/ColumnSettings';
import { PageContainer } from '@/components/PageContainer';
import { useActionsColumn } from '@/components/TableActions';
import {
    FEE_MODES,
    THIRDS,
    acctBadText,
    acctCanOnline,
    acctMask,
    acctOk,
    acctTypeName,
    feeText,
    money,
} from '@/biz/biz-dict';
import { useBizCreate, useBizRows, useBizUpdate } from '@/hooks/queries/biz';
import { tableScrollX, useTableDefaults } from '@/hooks/useTableDefaults';
import type { BizAccountView, BizPayoutAccountView, FeeMode, PayoutWay } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { BizStatus, BizToneTag, Cell, KpiRow, StatRules } from '../shared';

/**
 * 出款账户：钱从哪个账户出、扣多少手续费。
 *
 * 2026-11-16 重构：账户 / 主体 / 结算账户三项改为引用「账户管理」。
 * 「渠道（到账方式）」也由账户类型推出，不再是人选的下拉 —— 存两份会在换账户时对不上。
 * 「方式（线上 / 线下）」留在这页而不是账户上：同一张卡既能线上走通道、也能线下人工转账，
 * 方式要按用途选。
 */

const WAY_NAME: Record<string, string> = { bank: '银行卡', ali: '支付宝', wx: '微信' };

/** 支付宝接口凭证五项（两把密钥 + 三张证书） */
function aliCredCount(a: BizPayoutAccountView): number {
    if (!a.alipay) return 0;
    const keys: (keyof NonNullable<BizPayoutAccountView['alipay']>)[] = ['priv', 'pub', 'certApp', 'certAli', 'certRoot'];
    return keys.filter((k) => Boolean(a.alipay?.[k])).length;
}

/** 微信商家转账六项凭证，六项齐了才发得出转账 */
function wxCredCount(a: BizPayoutAccountView): number {
    if (!a.wx) return 0;
    const keys: (keyof NonNullable<BizPayoutAccountView['wx']>)[] = ['mchid', 'priv', 'serial', 'pub', 'apiV3', 'appId'];
    return keys.filter((k) => Boolean(a.wx?.[k])).length;
}

/** 这一路要几项凭证、齐了几项 */
function credInfo(a: BizPayoutAccountView): { need: number; got: number } | null {
    if (a.way === 'ali') return { need: 5, got: aliCredCount(a) };
    if (a.way === 'wx') return { need: 6, got: wxCredCount(a) };
    return null;
}

const MASK = '****************';

function PayoutFormModal({
    record,
    accounts,
    payouts,
    onClose,
}: {
    record: BizPayoutAccountView | null;
    accounts: BizAccountView[];
    payouts: BizPayoutAccountView[];
    onClose: () => void;
}) {
    const create = useBizCreate<BizPayoutAccountView>('bizPayoutAccount');
    const update = useBizUpdate<BizPayoutAccountView>('bizPayoutAccount');
    const lock = record !== null;

    const [alias, setAlias] = useState(record?.alias ?? '');
    const [acctCode, setAcctCode] = useState(record?.acct ?? '');
    const [online, setOnline] = useState(record?.online ?? true);
    const [third, setThird] = useState(record?.third || '汇付天下');
    const [mode, setMode] = useState<FeeMode>(record?.mode ?? 'combo');
    const [single, setSingle] = useState<number>(record?.single ?? 0);
    const [rate, setRate] = useState<number>(record?.rate ?? 0);
    const [minFee, setMinFee] = useState<number>(record?.minFee ?? 0);
    const [maxFee, setMaxFee] = useState<number>(record?.maxFee ?? 0);
    const [note, setNote] = useState(record?.note ?? '');
    const [priv, setPriv] = useState(record?.alipay?.priv ? MASK : '');
    const [pub, setPub] = useState(record?.alipay?.pub ? MASK : '');
    const [certApp, setCertApp] = useState(record?.alipay?.certApp ?? '');
    const [certAli, setCertAli] = useState(record?.alipay?.certAli ?? '');
    const [certRoot, setCertRoot] = useState(record?.alipay?.certRoot ?? '');
    const [wxMchid, setWxMchid] = useState(record?.wx?.mchid ?? '');
    const [wxPriv, setWxPriv] = useState(record?.wx?.priv ? MASK : '');
    const [wxSerial, setWxSerial] = useState(record?.wx?.serial ?? '');
    const [wxPub, setWxPub] = useState(record?.wx?.pub ? MASK : '');
    const [wxApiV3, setWxApiV3] = useState(record?.wx?.apiV3 ? MASK : '');
    const [wxAppId, setWxAppId] = useState(record?.wx?.appId ?? '');

    const account = accounts.find((a) => a.code === acctCode);
    const type = account?.type ?? '';
    const canOnline = acctCanOnline(type);
    // 其余类型固定线下，置灰不可变更
    const effectiveOnline = canOnline ? online : false;
    const way: PayoutWay = type || 'bank';
    const isBank = way === 'bank';
    const bad = account ? acctBadText(account) : '';

    /** 留空按「主体 + 类型 + 三方」生成，别让列表出现空别名 */
    const autoAlias = () =>
        account ? `${account.subject.replace(/有限公司.*$/, '')}${acctTypeName(type)}${isBank && third ? third.slice(0, 2) : ''}` : '';

    const submit = () => {
        if (!account) {
            Toast.warning('要选一条账户');
            return;
        }
        // 线上这一路的手续费是成本的一部分，必须填清楚；线下常常就是 0，一项不填按免费
        if (effectiveOnline && mode === 'single' && single <= 0) {
            Toast.warning('线上手续费必填：单笔手续费要填一个大于 0 的数');
            return;
        }
        if (effectiveOnline && mode === 'rate' && rate <= 0) {
            Toast.warning('线上手续费必填：费率要填一个大于 0 的数');
            return;
        }
        const body: Partial<BizPayoutAccountView> = {
            alias: alias.trim() || autoAlias(),
            acct: acctCode,
            online: effectiveOnline,
            // 以下四项从账户带出，不再手填
            provider: way === 'ali' ? '支付宝' : way === 'wx' ? '微信' : third,
            way,
            subject: account.subject,
            acctLabel: `${account.bank || acctTypeName(account.type)} · ${acctMask(account.acct)}`,
            third: isBank && effectiveOnline ? third : '',
            mode: effectiveOnline ? mode : mode === 'free' ? 'free' : mode,
            single: mode === 'single' || mode === 'combo' ? single : 0,
            rate: mode === 'rate' || mode === 'combo' ? rate : 0,
            minFee: mode === 'free' ? 0 : minFee,
            maxFee: mode === 'free' ? 0 : maxFee,
            note: note.trim(),
            ...(way === 'ali'
                ? {
                      alipay: {
                          // 回显的是一串星号 = 没改，保留原值
                          priv: priv === MASK ? record?.alipay?.priv ?? '' : priv,
                          pub: pub === MASK ? record?.alipay?.pub ?? '' : pub,
                          certApp,
                          certAli,
                          certRoot,
                      },
                  }
                : {}),
            ...(way === 'wx'
                ? {
                      wx: {
                          mchid: wxMchid,
                          priv: wxPriv === MASK ? record?.wx?.priv ?? '' : wxPriv,
                          serial: wxSerial,
                          pub: wxPub === MASK ? record?.wx?.pub ?? '' : wxPub,
                          apiV3: wxApiV3 === MASK ? record?.wx?.apiV3 ?? '' : wxApiV3,
                          appId: wxAppId,
                      },
                  }
                : {}),
        };
        const done = () => {
            Toast.success(lock ? '已保存' : '已新增，默认未启用');
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
                    wd: false,
                    at: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`,
                },
                { onSuccess: done },
            );
        }
    };

    const sameWay = payouts.filter((a) => a.way === way && a.wd && a.id !== record?.id);

    return (
        <Modal
            title={lock ? `修改出款账户 · ${record.alias || record.code}` : '新增出款账户'}
            visible
            width={720}
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
            <div className="biz-calc" style={{ marginBottom: 12 }}>
                {lock ? (
                    <>
                        <b>主体账户与三方渠道创建后不可修改。</b>费率、接口凭证、以及这条账户进的出款池都挂在它们上；
                        要换通道请新建一条，把这条停用。允许改的是<b>别名、方式、手续费与备注</b>。
                    </>
                ) : (
                    <>
                        这条出款账户的<b>主体、结算账户、渠道</b>都从「账户管理」带出，不在这里手填 ——
                        同一个人在两处各填一遍，改了一处忘另一处时，出款单上的户名与实际到账的卡就对不上。
                    </>
                )}
            </div>

            <div className="biz-form-grid">
                <Field label="别名" hint="列表、C 端出款记录、审计日志都用它；留空按「主体 + 类型 + 三方」生成">
                    <Input value={alias} onChange={setAlias} placeholder={autoAlias() || '如 银行卡出款主用'} />
                </Field>
                <Field
                    label={`主体账户${lock ? '（不可修改）' : ''}`}
                    hint="选项来自「账户管理」；选中后自动展示主体 / 卡名 / 结算账户 / 状态"
                >
                    <Select
                        value={acctCode}
                        disabled={lock}
                        onChange={(v) => setAcctCode(String(v))}
                        style={{ width: '100%' }}
                        optionList={accounts.map((a) => ({
                            label: `${a.subject} · ${acctTypeName(a.type)} · ${acctMask(a.acct)}${acctBadText(a) ? `（${acctBadText(a)}）` : ''}`,
                            value: a.code,
                        }))}
                        filter
                        placeholder="选一条账户"
                    />
                </Field>
            </div>

            {account ? (
                <div className={`biz-calc${bad ? ' biz-calc--bad' : ''}`}>
                    <b>{account.subject}</b> · {acctTypeName(account.type)}
                    {account.bank ? ` · ${account.bank}` : ''} · <span className="biz-mono">{acctMask(account.acct)}</span>
                    {'　'}
                    {acctOk(account) ? (
                        <BizToneTag tone="ok">正常 · 未冻结</BizToneTag>
                    ) : (
                        <BizToneTag tone="danger">{bad}</BizToneTag>
                    )}
                    {bad ? <div style={{ marginTop: 4 }}>账户{bad}：允许保存、允许登记，但<b>出不了款</b> —— 启用后也出不了。</div> : null}
                </div>
            ) : null}

            <div className="biz-form-grid">
                <Field
                    label="方式"
                    hint={
                        canOnline
                            ? '同一张卡既能线上走通道、也能线下人工转账，按用途选'
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
                            { label: '线下（人工转账，不要凭证）', value: 'offline' },
                        ]}
                    />
                </Field>
                {isBank && effectiveOnline ? (
                    <Field label="三方渠道" hint="银行卡出款走谁的通道与费率">
                        <Select
                            value={third}
                            disabled={lock}
                            onChange={(v) => setThird(String(v))}
                            style={{ width: '100%' }}
                            optionList={THIRDS.map((t) => ({ label: t, value: t }))}
                        />
                    </Field>
                ) : null}
            </div>

            <div className="biz-section-title">手续费（{effectiveOnline ? '线上必填' : '线下选填，一项不填按免费'}）</div>
            <div className="biz-form-grid biz-form-grid--3">
                <Field label="手续费模式" hint="免费不是「费率填 0」—— 选免费才是明确不收费">
                    <Select
                        value={mode}
                        onChange={(v) => setMode(v as FeeMode)}
                        style={{ width: '100%' }}
                        optionList={Object.entries(FEE_MODES).map(([k, v]) => ({ label: v.t, value: k }))}
                    />
                </Field>
                {mode === 'single' || mode === 'combo' ? (
                    <Field label="单笔手续费（元）">
                        <InputNumber
                            value={single}
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => setSingle(typeof v === 'number' ? v : 0)}
                        />
                    </Field>
                ) : null}
                {mode === 'rate' || mode === 'combo' ? (
                    <Field label="费率（%）">
                        <InputNumber
                            value={rate}
                            min={0}
                            max={100}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => setRate(typeof v === 'number' ? v : 0)}
                        />
                    </Field>
                ) : null}
                {mode !== 'free' ? (
                    <>
                        <Field label="最低手续费（元）">
                            <InputNumber
                                value={minFee}
                                min={0}
                                precision={2}
                                style={{ width: '100%' }}
                                onChange={(v) => setMinFee(typeof v === 'number' ? v : 0)}
                            />
                        </Field>
                        <Field label="最高手续费（元）">
                            <InputNumber
                                value={maxFee}
                                min={0}
                                precision={2}
                                style={{ width: '100%' }}
                                onChange={(v) => setMaxFee(typeof v === 'number' ? v : 0)}
                            />
                        </Field>
                    </>
                ) : null}
            </div>
            <div className="biz-calc">
                按当前配置，出款 ¥1,000 的手续费约 <b>¥ {money(feeTextPreview(mode, single, rate, minFee, maxFee))}</b>
                {mode === 'free' ? '（免费，全额到账）' : ''}
            </div>

            {way === 'ali' && effectiveOnline ? (
                <>
                    <div className="biz-section-title">支付宝接口凭证</div>
                    <div className="biz-dim" style={{ fontSize: 12, marginBottom: 8, lineHeight: 1.7 }}>
                        支付宝按「应用」签约，要五样：两把密钥 + 三张证书。
                        <b>密钥保存后只能覆盖、不回显；证书只能覆盖、不提供下载。</b>
                    </div>
                    <div className="biz-form-grid">
                        <Field label="应用私钥">
                            <Input value={priv} onChange={setPriv} placeholder="MIIEvQIBADANBgkq…" />
                        </Field>
                        <Field label="应用公钥">
                            <Input value={pub} onChange={setPub} placeholder="MIIBIjANBgkqhkiG…" />
                        </Field>
                        <Field label="应用公钥证书">
                            <Input value={certApp} onChange={setCertApp} placeholder="appCertPublicKey_xxx.crt" />
                        </Field>
                        <Field label="支付宝公钥证书">
                            <Input value={certAli} onChange={setCertAli} placeholder="alipayCertPublicKey_RSA2.crt" />
                        </Field>
                        <Field label="支付宝根证书">
                            <Input value={certRoot} onChange={setCertRoot} placeholder="alipayRootCert.crt" />
                        </Field>
                    </div>
                </>
            ) : null}

            {way === 'wx' && effectiveOnline ? (
                <>
                    <div className="biz-section-title">微信商家转账凭证</div>
                    <div className="biz-dim" style={{ fontSize: 12, marginBottom: 8, lineHeight: 1.7 }}>
                        微信按「商户号」签约，要六项：比支付宝多商户号与 AppID，并且要 APIv3 密钥（回调验签用）。
                        <b>六项齐了才发得出转账。</b>
                    </div>
                    <div className="biz-form-grid">
                        <Field label="商户号（mchid）">
                            <Input value={wxMchid} onChange={setWxMchid} placeholder="1900000109" />
                        </Field>
                        <Field label="AppID">
                            <Input value={wxAppId} onChange={setWxAppId} placeholder="wxd678efh567hg6787" />
                        </Field>
                        <Field label="证书私钥">
                            <Input value={wxPriv} onChange={setWxPriv} placeholder="-----BEGIN PRIVATE KEY-----" />
                        </Field>
                        <Field label="证书序列号">
                            <Input value={wxSerial} onChange={setWxSerial} placeholder="5157F09EFDC096DE15EBE81A47057A72" />
                        </Field>
                        <Field label="公钥">
                            <Input value={wxPub} onChange={setWxPub} placeholder="-----BEGIN PUBLIC KEY-----" />
                        </Field>
                        <Field label="APIv3 密钥">
                            <Input value={wxApiV3} onChange={setWxApiV3} placeholder="32 位字符（回调验签用）" />
                        </Field>
                    </div>
                </>
            ) : null}

            <Field label="备注（只给后台看）">
                <Input value={note} onChange={setNote} placeholder="如 银行卡出款主用" />
            </Field>
            {sameWay.length ? (
                <div className="biz-calc">
                    <b>{WAY_NAME[way]}已启用的还有 {sameWay.map((a) => a.alias || a.code).join('、')}。</b>
                    同一种到账方式只能启用一条 —— 保存后要启用这一条，需先把那条关掉。
                </div>
            ) : null}
            {!lock ? (
                <div className="biz-calc">
                    新建的账户默认<b>未启用</b>：登记一条出款通道和允许它出款是两件事，
                    费率还没核对就接管出款是最不该发生的事。
                </div>
            ) : null}
        </Modal>
    );
}

/** 试算：按 1000 元一笔，把「费率 + 固定费 + 上下限」合成一个数 */
function feeTextPreview(mode: FeeMode, single: number, rate: number, minFee: number, maxFee: number): number {
    if (mode === 'free') return 0;
    const raw = (1000 * (mode === 'single' ? 0 : rate)) / 100 + (mode === 'rate' ? 0 : single);
    let fee = +raw.toFixed(2);
    if (minFee > 0 && fee < minFee) fee = minFee;
    if (maxFee > 0 && fee > maxFee) fee = maxFee;
    return +fee.toFixed(2);
}

export default function PayoutAccountsPage() {
    const [editing, setEditing] = useState<BizPayoutAccountView | null | undefined>(undefined);
    const { tableProps, pageSize, pageSizeOpts } = useTableDefaults();
    const { data = [], isFetching } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const update = useBizUpdate<BizPayoutAccountView>('bizPayoutAccount');

    const acctOf = useMemo(() => (code: string) => accounts.find((a) => a.code === code), [accounts]);
    const liveOf = (way: PayoutWay) => data.filter((a) => a.wd && a.way === way);
    const bankLive = liveOf('bank');
    const aliLive = liveOf('ali');
    const wxLive = liveOf('wx');
    const used = data.filter((a) => a.wd).length;
    /** 凭证齐全：支付宝 5 项 / 微信 6 项，齐了才算 ready */
    const credReady = data.filter((a) => {
        const c = credInfo(a);
        return c && c.got === c.need;
    }).length;
    const gaps = (['bank', 'ali', 'wx'] as PayoutWay[]).filter((w) => liveOf(w).length === 0);

    /** 启用 / 关闭：同一种到账方式只允许一条，开新的先关旧的 */
    const toggle = (a: BizPayoutAccountView) => {
        const acct = acctOf(a.acct);
        if (a.wd) {
            update.mutate({ id: a.id, body: { wd: false } }, { onSuccess: () => Toast.success(`${a.alias || a.code} 已关闭`) });
            return;
        }
        // 线上这一层靠渠道凭证出款，主体异常 / 冻结时钱出不去 —— 直接不让开，而不是开了再失败
        if (a.online && acct && !acctOk(acct)) {
            Toast.error(`主体${acctBadText(acct)}，不能开启 —— 先到「账户管理」恢复正常或解冻`);
            return;
        }
        const other = liveOf(a.way).filter((x) => x.id !== a.id);
        if (!other.length) {
            update.mutate({ id: a.id, body: { wd: true } }, { onSuccess: () => Toast.success(`${a.alias || a.code} 已启用`) });
            return;
        }
        Modal.confirm({
            title: `切换${WAY_NAME[a.way]}的出款账户？`,
            content: `同一种到账方式只能启用一条。启用 ${a.alias || a.code} 会先关掉 ${other.map((x) => x.alias || x.code).join('、')}。`,
            okText: '切换',
            cancelText: '取消',
            onOk: async () => {
                for (const o of other) {
                    await update.mutateAsync({ id: o.id, body: { wd: false } });
                }
                await update.mutateAsync({ id: a.id, body: { wd: true } });
                Toast.success(`已切换到 ${a.alias || a.code}`);
            },
        });
    };

    const columns: ColumnProps<BizPayoutAccountView>[] = [
        {
            title: '别名',
            dataIndex: 'alias',
            width: 160,
            render: (v: string, a: BizPayoutAccountView) => <b style={{ fontWeight: 560 }}>{v || a.code}</b>,
        },
        {
            title: '账户',
            dataIndex: 'acct',
            width: 230,
            render: (_: unknown, a: BizPayoutAccountView) => {
                const acct = acctOf(a.acct);
                const bad = acct ? acctBadText(acct) : '账户不存在';
                return (
                    <Cell
                        main={
                            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                                <BizToneTag tone={a.way === 'ali' ? 'brand' : a.way === 'wx' ? 'ok' : 'neutral'}>
                                    {acctTypeName(acct?.type ?? a.way)}
                                </BizToneTag>
                                <span className="biz-mono">{acctMask(acct?.acct ?? '')}</span>
                                {bad ? <BizToneTag tone="danger">{bad}</BizToneTag> : null}
                            </span>
                        }
                        sub={`${a.code} · ${a.subject}`}
                    />
                );
            },
        },
        { title: '公司主体', dataIndex: 'subject', width: 210, render: (v: string) => <span style={{ fontSize: 12 }}>{v}</span> },
        {
            title: '银行卡名称',
            dataIndex: 'acctLabel',
            width: 210,
            render: (_: unknown, a: BizPayoutAccountView) => {
                const acct = acctOf(a.acct);
                if (acct?.type !== 'bank') return <span className="biz-dim">—</span>;
                return <span className="biz-cell__sub">{acct.bank || '—'}</span>;
            },
        },
        {
            title: '方式',
            dataIndex: 'online',
            width: 88,
            render: (v: boolean) =>
                v ? <BizToneTag tone="brand">线上</BizToneTag> : <BizToneTag tone="neutral">线下</BizToneTag>,
        },
        {
            title: '三方渠道',
            dataIndex: 'third',
            width: 110,
            render: (v: string) => (v ? <span style={{ fontSize: 12 }}>{v}</span> : <span className="biz-dim">—</span>),
        },
        {
            title: '手续费',
            dataIndex: 'mode',
            width: 150,
            render: (_: unknown, a: BizPayoutAccountView) => (
                <Cell
                    main={<b className="biz-num">{feeText(a)}</b>}
                    sub={a.mode === 'free' ? '免费，全额到账' : `¥${money(a.minFee)} / ¥${money(a.maxFee)}`}
                />
            ),
        },
        {
            title: '凭证',
            dataIndex: 'alipay',
            width: 96,
            render: (_: unknown, a: BizPayoutAccountView) => {
                const c = credInfo(a);
                if (!c) return <span className="biz-dim">不需凭证</span>;
                const okAll = c.got === c.need;
                return (
                    <BizStatus
                        dict={{
                            ok: { t: `${c.got}/${c.need}`, tone: 'ok' },
                            warn: { t: `${c.got}/${c.need}`, tone: 'warn' },
                        }}
                        value={okAll ? 'ok' : 'warn'}
                    />
                );
            },
        },
        {
            title: '启用',
            dataIndex: 'wd',
            width: 92,
            align: 'center',
            render: (_: unknown, a: BizPayoutAccountView) => {
                const acct = acctOf(a.acct);
                const bad = acct ? acctBadText(acct) : '账户不存在';
                // 线上 + 主体异常：开不了。已开启的会在账户被置为异常时自动关闭
                const locked = !a.wd && a.online && Boolean(bad);
                return (
                    <Button
                        size="small"
                        type={a.wd ? 'primary' : 'tertiary'}
                        theme={a.wd ? 'solid' : 'light'}
                        disabled={locked}
                        title={locked ? `主体${bad}，不能开启` : undefined}
                        onClick={() => toggle(a)}
                    >
                        {a.wd ? '已启用' : locked ? '不可启用' : '未启用'}
                    </Button>
                );
            },
        },
        { title: '操作', dataIndex: 'actions', fixed: 'right', width: 76 },
    ];

    const actionsOf = (a: BizPayoutAccountView) => [{ key: 'edit', label: '修改', onClick: () => setEditing(a) }];
    const { columns: settled, columnSettings } = useColumnSettings('biz/payout-accounts', columns);
    const { columns: tableColumns } = useActionsColumn(settled, actionsOf);

    const wayDesc = (live: BizPayoutAccountView[]) =>
        live[0]
            ? `${live[0].alias || live[0].code} · ${feeText(live[0])}`
            : '这一路出不了款 —— 卖家选这种方式提现会失败';

    return (
        <PageContainer
            title="出款账户"
            extra={
                <Space>
                    {columnSettings}
                    <Button type="primary" theme="solid" onClick={() => setEditing(null)}>
                        新增出款账户
                    </Button>
                </Space>
            }
        >
            <KpiRow
                items={[
                    { label: '出款账户', value: data.length, unit: '条', desc: `${used} 条已启用（每种到账方式一条），其余只在台账里` },
                    {
                        label: '银行卡',
                        value: bankLive[0]?.alias || bankLive[0]?.code || '未启用',
                        compact: true,
                        alert: bankLive.length === 0,
                        desc: wayDesc(bankLive),
                    },
                    {
                        label: '支付宝',
                        value: aliLive[0]?.alias || aliLive[0]?.code || '未启用',
                        compact: true,
                        alert: aliLive.length === 0,
                        desc: wayDesc(aliLive),
                    },
                    {
                        label: '微信',
                        value: wxLive[0]?.alias || wxLive[0]?.code || '未启用',
                        compact: true,
                        desc: wayDesc(wxLive),
                    },
                    {
                        label: '接口凭证齐全',
                        value: `${credReady} / ${data.length}`,
                        compact: true,
                        desc: '支付宝 5 项 / 微信 6 项，齐了才算 ready',
                    },
                ]}
            />
            <StatRules
                items={[
                    '<b>本页只答两个问题：钱从哪个账户出（账户 + 方式 + 三方 + 费率），这个到账方式现在用的是哪一条（启用开关）。</b>不在本页：账户本身的登记与状态（「账户管理」）、提现的闸门与对用户的费率（「提现规则」）、交易手续费与包赔费（「交易规则」）、某一笔号款是否到账（「提现管理」）与出款凭证（「财务凭证」）。',
                    '<b>同一种到账方式只允许启用一条。</b>一次出款只走一个账户：同时开两条就必须回答「这一笔走哪条」，而这个问题没有答案。所以要换账户 —— 先把当前那条关掉，再开新的（不静默替换：换出款账户是资金动作）。银行卡、支付宝、微信各一条，互不相干。',
                    '<b>这张表的数是「配置」，不是「流水」。</b>出款金额在「提现管理」；出款账户 = 登记过的全部条数（含停用），停用的不删除 —— 历史出款要能按账户反查到当时的费率与主体。',
                    '<b>这里的费率是「渠道向平台收的成本」，只用于对账。</b>向卖家 / 买家收多少在「交易规则」「提现规则」里配。<b>两个数分属两页不是重复，而是两种主体</b> —— 一个是成本，一个是收入；放同一页会让人以为改这里就等于改了对用户的手续费。',
                    '<b>「方式（线上 / 线下）」是这一页的字段，不是账户的。</b>同一张卡既能线上走通道、也能线下人工转账，所以方式按用途在引用处选。线上：手续费与凭证必配（真会被渠道扣钱）；线下：整组手续费选填、不要凭证（常常就是 0，逼着填只会让人瞎填）。',
                    '<b>线上这一条：账户异常 / 冻结时开关点不动，已开的自动关闭，恢复后不自动开回来。</b>线上出款要调的是那条账户的渠道接口，账户不可用就出不了款 —— 与其让人点开、在出款那一刻失败，不如当场置灰写明「先修账户」。<b>线下出款不看账户状态</b>：钱是人工走款，账户状态只影响「收不收得到」，不影响「发不发得出」。',
                    '<b>接口凭证齐全 = 凭证项齐了的账户数 / 账户总数</b>（支付宝 5 项、微信 6 项）。少一样就调不通接口；密钥只进不出，回显一串星号，要换就整串重填。',
                ]}
            />

            {data.some((a) => a.online && !acctOk(acctOf(a.acct) ?? { normal: true, frozen: false })) ? (
                <div className="biz-calc biz-calc--bad" style={{ marginBottom: 12 }}>
                    <b>有线上出款账户引用了异常 / 冻结的账户</b> —— 这几路现在出不了款，也开不了。
                    回到「账户管理」把主体恢复正常或解冻，开关才重新可用。<b>线下出款不受影响</b>（人工转账不看渠道状态）。
                </div>
            ) : null}

            {gaps.length ? (
                <div className="biz-calc" style={{ marginBottom: 12 }}>
                    <b className="biz-warn">{gaps.map((g) => WAY_NAME[g]).join('、')}这一路现在没有启用的出款账户。</b>
                    卖家选这种到账方式提现会被拦下 —— 在下面列表里点「未启用」开一条即可。
                </div>
            ) : null}

            <Table<BizPayoutAccountView>
                {...tableProps}
                rowKey="code"
                columns={tableColumns}
                dataSource={data}
                loading={isFetching}
                scroll={{ x: tableScrollX(tableColumns) }}
                pagination={{ pageSize, pageSizeOpts, showSizeChanger: true, showTotal: true }}
            />

            <div className="biz-dim" style={{ fontSize: 12, marginTop: 10, lineHeight: 1.9 }}>
                <b>同一种到账方式只能启用一条</b>：一次出款只走一个账户，多开几条没有分流可依。
                要换账户 —— 先把当前那条关掉，再开新的；旧账户停用不删除，历史出款仍能反查。
                <br />
                <b>这一页的费率是「渠道向平台收的」，只用于对账。</b>向卖家 / 买家收多少在「交易规则」「提现规则」里配。
                <br />
                <b>把某一路关空是允许的</b>（临时停掉出款是正当需求），但那一瞬间这一路就取不出钱了 ——
                卖家选这种到账方式提现会被拦下，所以页面顶部会挂一条告警，不阻止操作。
            </div>

            {editing !== undefined ? (
                <PayoutFormModal record={editing} accounts={accounts} payouts={data} onClose={() => setEditing(undefined)} />
            ) : null}
        </PageContainer>
    );
}
