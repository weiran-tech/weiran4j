import { Banner, Button, Input, InputNumber, Space, Spin, Switch, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { money, money0, wdFeeCalc } from '@/biz/biz-dict';
import { usePayRule, useSavePayRule } from '@/hooks/queries/biz';
import type { BizPayRuleView, PayRuleWay } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { StatRules } from '../shared';

/**
 * 提现规则：用户把**推广返利金**提出去时的闸门、费率与限额。
 *
 * 只作用于返利提现（用户自己在 C 端钱包发起、平台代付的那一路）。
 * 卖号货款由系统自动分账出款，不看这一页 —— 所以这里的金额尺度按返利金配，
 * 返利金是几十块、上百块的小钱。
 *
 * **交易手续费与包赔费不在这页**：它们结在买家确认收货那一刻，在「交易规则」里配。
 * 挤在一页里，运营改错一格会同时改掉两条业务线。
 */

/**
 * 试算按一笔 ¥35 的返利提现算。
 *
 * 原来按 ¥1,000 试算，配上「单笔最高 ¥2 万」的区间，整页看起来像在配卖号货款 ——
 * 而这两张卡片管的是推广返利金，几十块是它的日常尺度。取 ¥35 既不夸张，
 * 也在两种方式的区间之内（金额小于银行卡单笔下限时，试算里会看不见「能不能提」）。
 */
const PREVIEW_AMT = 35;

function feePreview(o: {
    feeOn: boolean;
    feeRate: number;
    feeFixed?: number;
    feeMin: number;
    feeMax: number;
    min: number;
    max: number;
}): { text: string; bad: boolean } {
    const bad: string[] = [];
    if (!(o.feeRate >= 0 && o.feeRate <= 100)) bad.push('手续费要在 0–100（%）之间');
    if (o.feeMin < 0 || o.feeMax < 0) bad.push('手续费上下限不能为负');
    if (o.feeMax > 0 && o.feeMax < o.feeMin) bad.push('最高手续费不能低于最低手续费');
    if (o.min < 0 || o.max < 0) bad.push('单笔金额不能为负');
    if (o.max > 0 && o.max <= o.min) bad.push('单笔返利提现最高金额要大于最低金额');
    if (bad.length) return { text: bad.join('；'), bad: true };

    const amt = PREVIEW_AMT;
    const fee = wdFeeCalc(amt, o);
    const lo = o.min > 0 ? `¥${money0(o.min)}` : '不限';
    const hi = o.max > 0 ? `¥${money0(o.max)}` : '不限';
    if (!o.feeOn) {
        return { text: `试算：提现 ¥${money0(amt)} → 免手续费，到账 ¥${money0(amt)}；单笔可提 ${lo} – ${hi}`, bad: false };
    }
    const formula = `${o.feeRate}%${o.feeFixed ? ` + ¥${money(o.feeFixed)}` : ''}`;
    return {
        text: `试算：提现 ¥${money0(amt)} → 手续费 ¥${money(fee)}（${formula}），到账 ¥${money(amt - fee)}；单笔可提 ${lo} – ${hi}`,
        bad: false,
    };
}

function CalcLine({ res }: { res: { text: string; bad: boolean } }) {
    return <div className={`biz-calc${res.bad ? ' biz-calc--bad' : ''}`}>{res.text}</div>;
}

function WayCard({
    title,
    sub,
    switchHint,
    fixed,
    value,
    onChange,
}: {
    title: string;
    sub: string;
    switchHint: string;
    fixed: boolean;
    value: PayRuleWay;
    onChange: (next: PayRuleWay) => void;
}) {
    const set = (patch: Partial<PayRuleWay>) => onChange({ ...value, ...patch });
    const res = feePreview({
        feeOn: value.feeOn,
        feeRate: value.feeRate,
        ...(fixed ? { feeFixed: value.feeFixed ?? 0 } : {}),
        feeMin: value.feeMin,
        feeMax: value.feeMax,
        min: value.min,
        max: value.max,
    });
    return (
        <div className="biz-pool" style={{ marginBottom: 14 }}>
            <div className="biz-pool__h">
                <b style={{ fontSize: 13 }}>{title}</b>
                <span className="biz-dim" style={{ fontSize: 11 }}>
                    {sub}
                </span>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="biz-dim" style={{ fontSize: 11 }}>
                        {value.feeOn ? `手续费 ${value.feeRate}%${fixed && value.feeFixed ? ` + ¥${money(value.feeFixed)}` : ''}` : '免手续费'}
                    </span>
                    <Switch checked={value.on} size="small" onChange={(v) => set({ on: v })} />
                    <span className="biz-dim" style={{ fontSize: 11 }}>
                        {value.on ? '提现已开启' : '提现已关闭'}
                    </span>
                </span>
            </div>
            <div style={{ padding: '12px 14px' }}>
                <div className="biz-dim" style={{ fontSize: 11, marginBottom: 8 }}>
                    {switchHint}
                </div>
                <div className="biz-form-grid biz-form-grid--3">
                    <Field label="手续费是否开启" hint="关掉后这一方式不收任何手续费，费率与固定费都不生效">
                        <Switch checked={value.feeOn} onChange={(v) => set({ feeOn: v })} />
                    </Field>
                    <Field label="手续费（%）" hint="0.5 表示提 100 元收 0.5 元">
                        <InputNumber
                            value={value.feeRate}
                            min={0}
                            max={100}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feeRate: typeof v === 'number' ? v : 0 })}
                        />
                    </Field>
                    {fixed ? (
                        <Field label="固定手续费（元）" hint="留空 = 不收；填了就在费率算出的手续费上再加这一笔（按笔收）">
                            <InputNumber
                                value={value.feeFixed ?? 0}
                                min={0}
                                precision={2}
                                style={{ width: '100%' }}
                                onChange={(v) => set({ feeFixed: typeof v === 'number' ? v : 0 })}
                            />
                        </Field>
                    ) : null}
                    <Field label="最低手续费（元）" hint="低于这个数按这个数收；0 = 不限">
                        <InputNumber
                            value={value.feeMin}
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feeMin: typeof v === 'number' ? v : 0 })}
                        />
                    </Field>
                    <Field label="最高手续费（元）" hint="高于这个数封顶；0 = 不限">
                        <InputNumber
                            value={value.feeMax}
                            min={0}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feeMax: typeof v === 'number' ? v : 0 })}
                        />
                    </Field>
                    <Field label="单笔返利提现最低金额（元）" hint="低于这个数不让提交；0 = 不限">
                        <InputNumber
                            value={value.min}
                            min={0}
                            precision={0}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ min: typeof v === 'number' ? v : 0 })}
                        />
                    </Field>
                    <Field label="单笔返利提现最高金额（元）" hint="高于这个数要分笔提；0 = 不限">
                        <InputNumber
                            value={value.max}
                            min={0}
                            precision={0}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ max: typeof v === 'number' ? v : 0 })}
                        />
                    </Field>
                </div>
                <Field
                    label="给用户看的说明（展示在 C 端返利提现弹层）"
                    hint="这段话原样出现在 C 端「钱包 → 提现」的转账弹层里 —— 用户看到的解释与实际扣费必须是同一套"
                >
                    <Input value={value.note} onChange={(note) => set({ note })} placeholder="如：返利金提到支付宝账号，1–2 个工作日到账……" />
                </Field>
                <CalcLine res={res} />
            </div>
        </div>
    );
}

function PayRulesForm({ initial }: { initial: BizPayRuleView }) {
    const save = useSavePayRule();
    const [general, setGeneral] = useState(initial.general);
    const [ali, setAli] = useState<PayRuleWay>(initial.ali);
    const [bank, setBank] = useState<PayRuleWay>(initial.bank);

    const genBad: string[] = [];
    if (general.dayCap < 0 || general.dayCap > 9999999) genBad.push('当日上限填 0–9999999');
    if (general.reviewCap < 0 || general.reviewCap > 9999999) genBad.push('待审核上限填 0–9999999');
    if (general.dayCap > 0 && general.reviewCap > general.dayCap) genBad.push('待审核上限不能高于当日上限，否则永远触发不了');
    if (general.freezeMin < 0 || general.freezeMin > 1440) genBad.push('冻结时间填 0–1440 分钟');
    if (!ali.on && !bank.on) genBad.push('两种到账方式不能同时关闭 —— 都关掉返利金就提不出来了');

    const genText = (() => {
        if (genBad.length) return genBad.join('；');
        const a = general.dayCap > 0 ? `当日最多提 ¥${money0(general.dayCap)}，到顶直接拦下` : '当日提现金额不限';
        const b = !general.auto
            ? '所有提现都要人工审核'
            : general.reviewCap > 0
              ? `当日累计超过 ¥${money0(general.reviewCap)} 之后转人工审核`
              : '当日提现全部自动处理';
        const c = general.freezeMin > 0 ? `发起后金额冻结 ${general.freezeMin} 分钟` : '不设冻结时间';
        return `${a} · ${b} · ${c}`;
    })();

    const submit = () => {
        if (genBad.length) {
            Toast.warning(genBad[0] ?? '规则有冲突');
            return;
        }
        // 不带 trade：交易手续费已经拆到「交易规则」页，这里再提交一次会覆盖那一页刚存的值
        save.mutate(
            { general, ali, bank },
            { onSuccess: () => Toast.success('已提交，C 端与单据读的就是这份配置') },
        );
    };

    return (
        <>
            <div className="biz-pool">
                <div className="biz-pool__h">
                    <b style={{ fontSize: 13 }}>通用规则</b>
                    <span className="biz-dim" style={{ fontSize: 11 }}>
                        对<b>返利提现</b>生效 —— 用户把推广返利金提出去时，按这一笔的金额受这几项约束
                    </span>
                    <span style={{ marginLeft: 'auto', display: 'flex', gap: 6, alignItems: 'center' }}>
                        <Switch checked={general.auto} size="small" onChange={(v) => setGeneral({ ...general, auto: v })} />
                        <span className="biz-dim" style={{ fontSize: 11 }}>
                            {general.auto ? '自动处理' : '全部人工审核'}
                        </span>
                    </span>
                </div>
                <div style={{ padding: '12px 14px' }}>
                    <div className="biz-form-grid biz-form-grid--3">
                        <Field label="当日返利提现金额上限（元）" hint="一个用户一天最多能提走多少返利金；0 = 不限。到顶直接拦下">
                            <InputNumber
                                value={general.dayCap}
                                min={0}
                                precision={0}
                                style={{ width: '100%' }}
                                onChange={(v) => setGeneral({ ...general, dayCap: typeof v === 'number' ? v : 0 })}
                            />
                        </Field>
                        <Field label="当日返利提现进入待审核上限（元）" hint="当日累计达到这个数之后转人工审核；0 = 不设，不能高于上面的上限">
                            <InputNumber
                                value={general.reviewCap}
                                min={0}
                                precision={0}
                                style={{ width: '100%' }}
                                onChange={(v) => setGeneral({ ...general, reviewCap: typeof v === 'number' ? v : 0 })}
                            />
                        </Field>
                        <Field label="返利提现冻结时间（分钟）" hint="0–1440；审核通过后先冻结这么久再交渠道">
                            <InputNumber
                                value={general.freezeMin}
                                min={0}
                                max={1440}
                                precision={0}
                                style={{ width: '100%' }}
                                onChange={(v) => setGeneral({ ...general, freezeMin: typeof v === 'number' ? v : 0 })}
                            />
                        </Field>
                    </div>
                    <div className={`biz-calc${genBad.length ? ' biz-calc--bad' : ''}`}>{genText}</div>
                </div>
            </div>

            <WayCard
                title="用户提现返利金到支付宝账号"
                sub="开关 · 费率 · 单笔区间 · 给用户看的说明"
                switchHint="关闭后 C 端「钱包 → 提现」里不出现「支付宝」这一项；已经提过的记录不受影响"
                fixed={false}
                value={ali}
                onChange={setAli}
            />
            <WayCard
                title="用户提现返利金到储蓄卡"
                sub="比支付宝多一个固定手续费（按笔收）"
                switchHint="关闭后 C 端「钱包 → 提现」里不出现「银行卡」这一项；已经提过的记录不受影响"
                fixed
                value={bank}
                onChange={setBank}
            />

            <div className="biz-dim" style={{ fontSize: 12, lineHeight: 1.9 }}>
                <b>这一页只管返利金出款。</b>交易手续费与包赔费在「交易规则」里配，结在买家确认收货那一刻；
                这里管的是用户在钱包里提推广返利金时扣多少、能提多少。
                <br />
                <b>卖号货款不看这一页。</b>买家确认收货时系统自动分账到卖家的卡 / 支付宝，不收提现手续费，
                也不受这里的上限与审核线约束。
                <br />
                <b>两种到账方式不能同时关闭</b> —— 都关掉返利金就提不出来了，所以这一条会直接拦下提交。
                <br />
                <b>点右上角「提交更新」才生效。</b>改动记进操作审计，能查到哪一项从多少改成了多少。
            </div>

            <div style={{ marginTop: 12 }}>
                <Space>
                    <Button type="primary" theme="solid" loading={save.isPending} onClick={submit}>
                        提交更新
                    </Button>
                </Space>
            </div>
        </>
    );
}

export default function PayRulesPage() {
    const { data, isPending } = usePayRule<BizPayRuleView>();
    return (
        <PageContainer title="提现规则">
            <StatRules
                items={[
                    '<b>本页只管一件事：用户把推广返利金提出去时扣多少、能提多少。</b>不在本页：交易手续费与包赔费（「交易规则」，一笔向卖家收、一笔向买家收）、出款账户与渠道成本（「出款账户」，只对账）、收款通道与分流（「收款商户」「路由分流」）、某一笔提现的结果（「提现管理」）。',
                    '<b>卖号货款不看这一页。</b>买家确认收货那一刻由系统自动分账出款，不受这里的上限、审核线与费率约束 —— 所以金额尺度按返利金配（几十块的小钱）。',
                    '<b>三张卡片职责不重叠。</b>通用规则是<b>闸门</b>（能提多少、何时转人工、冻结多久）；两张到账方式卡片只管<b>钱往哪儿打</b>（开关、费率、单笔区间、说明）。把费率写进通用规则，就会出现「提到支付宝按谁的费率算」这种谁也答不上的问题。',
                    '<b>当日上限是硬拦，待审核线是软转。</b>到上限直接不让提；到待审核线仍能提，只是转人工。待审核线<b>不能高于</b>当日上限 —— 高于等于这条线永远触发不了，写上去只是让人以为配了。',
                    '<b>冻结时长从审核通过那一刻起算，不是到账时间。</b>提交即冻结（钱先按住），到期自动交渠道；冻结期内这笔钱不能重复提。计时从审核通过算，是为了不让一个审了两天的单因为冻结期早过而直接跳打款。',
                    '<b>手续费 = 金额 × 费率 + 固定费，再夹最低 / 最高。</b>先算比例、再加固定费、最后夹上下限；反过来会出现「配了 ¥0.1 最低、加 ¥0.5 固定费后实收 ¥0.6」这种与最低值不符的结果。',
                    '<b>试算按一笔 ¥35 的返利提现。</b>返利金是几十块的小钱，按 ¥1,000 试算会让人以为在配货款出款。',
                    '<b>两种到账方式不能同时关闭。</b>关一种（只走储蓄卡）是正当配置；两种都关，返利金就一分钱也提不出来 —— 这不是「先关掉再配」，是直接断掉出款。',
                ]}
            />
            {isPending ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin size="large" />
                </div>
            ) : data ? (
                <PayRulesForm initial={data} />
            ) : (
                <Banner type="danger" description="提现规则读取失败，请刷新页面重试" />
            )}
        </PageContainer>
    );
}
