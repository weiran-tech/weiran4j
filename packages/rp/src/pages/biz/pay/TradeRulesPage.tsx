import { Banner, Button, InputNumber, Space, Spin, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { PageContainer } from '@/components/PageContainer';
import { feeOf, money, money0 } from '@/biz/biz-dict';
import { useSaveTradeRule, useTradeRule } from '@/hooks/queries/biz';
import type { BizTradeRuleView, TradeFeeRule } from '@/types/biz';
import { Field } from '../orders/OrdersModals';
import { StatRules } from '../shared';

/**
 * 交易规则：两笔费用，**收的对象不同**。
 *
 * ① 交易手续费 —— 向**卖家**收（平台抽成，从货款里扣）：卖家到手 = 标价 − 交易手续费。
 * ② 包赔费 —— 向**买家**收（买家为「号被找回能赔」付的钱，归平台，平台承担赔付）：
 *    买家实付 = 标价 + 包赔费，**不进卖家货款**。
 *
 * 通道费不在这里配 —— 它是平台付给收款渠道的成本，由平台承担、不向任何一方收。
 *
 * 为什么和「提现规则」拆成两页：结算时点不同 —— 交易手续费结在买家确认收货那一刻、
 * 包赔费结在下单那一刻、提现规则结在用户点「提现」那一刻。
 * 挤在一页里，运营改错一格会同时改掉两条业务线。
 */

/** 两项费用的合理区间不同：交易手续费是零钱兜底（0–9 元），包赔费是三位数兜底（0–9999 元） */
function boundsOf(kind: 'trade' | 'guar') {
    return kind === 'guar'
        ? { min: 0, minMax: 9999, maxMax: 99999, minHint: '0–9999；算出来低于这个数就按这个数收，0 = 不限' }
        : { min: 0, minMax: 9, maxMax: 99999, minHint: '个位数 0–9；算出来低于这个数就按这个数收，0 = 不限' };
}

function checkRule(r: TradeFeeRule, kind: 'trade' | 'guar'): string[] {
    const name = kind === 'guar' ? '包赔费' : '交易手续费';
    const b = boundsOf(kind);
    const bad: string[] = [];
    const pct = Number(r.feePct);
    if (!(pct >= 0 && pct <= 100)) bad.push(`${name}费率填 0–100（%），0 表示不收`);
    if (Math.round(pct * 100) !== +(pct * 100).toFixed(2)) bad.push(`${name}费率最多两位小数`);
    if (!(r.feeMin >= b.min && r.feeMin <= b.minMax) || Math.round(r.feeMin) !== r.feeMin) {
        bad.push(`${name}最低金额是 ${b.min}–${b.minMax} 的整数（元）`);
    }
    if (!(r.feeMax >= 0 && r.feeMax <= b.maxMax) || Math.round(r.feeMax) !== r.feeMax) {
        bad.push(`${name}最高金额是 0–${b.maxMax} 的整数（元）`);
    }
    if (r.feeMax > 0 && r.feeMin > 0 && r.feeMax < r.feeMin) bad.push(`${name}最高金额不能低于最低金额`);
    return bad;
}

/**
 * 试算：**两个金额各算一遍**。
 * 只看 ¥1,000 看不出「最低 1 元」有没有生效，只看 ¥20 又看不出封顶 —— 两个一起才读得懂上下限。
 *
 * 两块的落点不同，试算文案也跟着变（2026-11-17）：
 * 交易手续费从**卖家货款**扣，给「卖家到手」；包赔费向**买家**收，给「买家合计」。
 * 写成同一句话会让人以为两笔都从货款里扣。
 */
function preview(r: TradeFeeRule, kind: 'trade' | 'guar'): { text: string; bad: boolean } {
    const bad = checkRule(r, kind);
    if (bad.length) return { text: bad.join('；'), bad: true };
    const one = (amt: number) => {
        const fee = feeOf(amt, r);
        return kind === 'guar'
            ? `¥${money0(amt)} → 收 ¥${money(fee)}，买家合计 ¥${money(amt + fee)}`
            : `¥${money0(amt)} → 收 ¥${money(fee)}，卖家到手 ¥${money(amt - fee)}`;
    };
    if (!r.feePct && !r.feeMin && !r.feeMax) {
        return {
            text: kind === 'guar'
                ? '不收取包赔费：买家实付等于标价，包赔仍然免费'
                : '不收取交易手续费：这一项不从货款里扣，卖家到手等于标价',
            bad: false,
        };
    }
    const caps: string[] = [];
    if (r.feeMin > 0) caps.push('下限');
    if (r.feeMax > 0) caps.push('上限');
    const tail = caps.length ? `（已叠加${caps.join(' / ')}约束）` : '（未配上下限）';
    return { text: `试算（本项单独计算）：${one(20)} | ${one(1000)}${tail}`, bad: false };
}

function FeeBlock({
    title,
    hint,
    kind,
    value,
    onChange,
}: {
    title: string;
    hint: string;
    kind: 'trade' | 'guar';
    value: TradeFeeRule;
    onChange: (next: TradeFeeRule) => void;
}) {
    const set = (patch: Partial<TradeFeeRule>) => onChange({ ...value, ...patch });
    const res = preview(value, kind);
    const num = (v: number) => (typeof v === 'number' ? v : 0);
    const b = boundsOf(kind);
    return (
        <div className="biz-pool">
            <div className="biz-pool__h">
                <b style={{ fontSize: 13 }}>{title}</b>
                <span className="biz-dim" style={{ fontSize: 11 }}>
                    {hint}
                </span>
                <span style={{ marginLeft: 'auto' }}>
                    <span className="biz-dim" style={{ fontSize: 11 }}>
                        {value.feePct > 0 ? `当前 ${value.feePct}%` : '不收'}
                    </span>
                </span>
            </div>
            <div style={{ padding: '12px 14px' }}>
                <div className="biz-form-grid biz-form-grid--3">
                    <Field label="费率（%）" hint="按订单金额计，0–100：10 表示 1000 元的单一笔收 100 元；0 = 不收">
                        <InputNumber
                            value={value.feePct}
                            min={0}
                            max={100}
                            precision={2}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feePct: num(v as number) })}
                        />
                    </Field>
                    <Field label="最低金额（元）" hint={b.minHint}>
                        <InputNumber
                            value={value.feeMin}
                            min={b.min}
                            max={b.minMax}
                            precision={0}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feeMin: num(v as number) })}
                        />
                    </Field>
                    <Field label="最高金额（元）" hint="最多五位数 0–99999；算出来高于这个数就封顶，0 = 不限">
                        <InputNumber
                            value={value.feeMax}
                            min={0}
                            max={b.maxMax}
                            precision={0}
                            style={{ width: '100%' }}
                            onChange={(v) => set({ feeMax: num(v as number) })}
                        />
                    </Field>
                </div>
                <div className={`biz-calc${res.bad ? ' biz-calc--bad' : ''}`}>{res.text}</div>
            </div>
        </div>
    );
}

function TradeRulesForm({ initial }: { initial: BizTradeRuleView }) {
    const save = useSaveTradeRule();
    const [trade, setTrade] = useState<TradeFeeRule>(initial.trade);
    const [guar, setGuar] = useState<TradeFeeRule>(initial.guar);

    const submit = () => {
        const bad = [...checkRule(trade, 'trade'), ...checkRule(guar, 'guar')];
        if (bad.length) {
            Toast.warning(bad[0] ?? '规则有冲突');
            return;
        }
        save.mutate(
            { trade, guar },
            { onSuccess: () => Toast.success('已提交，新成交单按新值结算') },
        );
    };

    return (
        <>
            <FeeBlock
                title="交易手续费"
                kind="trade"
                hint="按订单金额的百分比向卖家收取，从货款里扣 —— 买家付的还是标价"
                value={trade}
                onChange={setTrade}
            />
            <FeeBlock
                title="包赔费"
                kind="guar"
                hint="买家为「号被找回能赔」付的钱，加在实付里、归平台（平台承担赔付）—— 不进卖家货款"
                value={guar}
                onChange={setGuar}
            />

            <div className="biz-dim" style={{ fontSize: 12, lineHeight: 1.9 }}>
                <b>两笔费用收的对象不同。</b>交易手续费向<b>卖家</b>收（从货款扣）：卖家到手 = 标价 − 交易手续费。
                包赔费向<b>买家</b>收（加在实付里，归平台、平台承担赔付）：买家实付 = 标价 + 包赔费。
                <b>包赔费不进卖家货款</b> —— 卖家卖号拿多少钱，与买家买不买包赔无关。
                <br />
                <b>通道费不在这里配。</b>它是平台付给收款渠道的成本，由平台自己承担、不向任何一方收，
                费率跟着「收款商户」的那条渠道走；订单详情里能看到这一单花了多少，只作对账。
                <br />
                <b>改了不影响已经发生的单。</b>交易手续费在<b>确认收货那一刻</b>落成快照（账号提现单），
                包赔费在<b>下单那一刻</b>落成快照（支付单与订单）—— 拿新费率去重算历史单，等于把已经对过的账推翻。
                <br />
                <b>最低 / 最高填 0 = 不限。</b>顺序固定：先按费率算，再夹下限、再夹上限 —— 反过来会让「最低 ¥1」变成「1% 的 ¥1」。
                <br />
                <b>包赔费默认 10%、最低 ¥10、最高 ¥1,000</b>：小额单按 ¥10 兜底（¥60 的号也至少收 ¥10），
                大额单封在 ¥1,000（¥20,000 的号不再按 10% 收 ¥2,000）。商品管理里可以按单个商品勾「免收包赔费」，不受这里约束。
                <br />
                <b>点「提交更新」才生效。</b>改动记进操作审计，能查到哪一项从多少改成了多少。
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

export default function TradeRulesPage() {
    const { data, isPending } = useTradeRule<BizTradeRuleView>();
    return (
        <PageContainer title="交易规则">
            <StatRules
                items={[
                    '<b>本页只负责两笔费用：交易手续费向卖家收、包赔费向买家收。</b>不在本页：返利提现的费率与单笔区间（「提现规则」）、出款账户的渠道成本（「出款账户」，只对账）、收款通道与分流（「收款商户」「路由分流」）。',
                    '<b>两条互不交叉的算式。</b>卖家到手 = 订单金额 − 交易手续费（<b>只扣这一项</b>，与提现单金额同口径）；买家实付 = 订单金额 + 包赔费。<b>包赔费不进卖家货款</b> —— 卖家卖号拿多少钱，与买家买不买包赔无关。',
                    '<b>结算时点各不同。</b>交易手续费结在买家<b>确认收货</b>那一刻；包赔费结在<b>下单</b>那一刻；提现规则结在<b>用户点提现</b>那一刻。时点不同所以拆成两页，改错一格不会连带改掉另一条业务线。',
                    '<b>上下限是给两头兜底的，不是给中间改价的。</b>低价单按最低费兜底、高价单按最高费封顶，中间的单仍按费率走。包赔费默认 10%、最低 ¥10、最高 ¥1,000；交易手续费的下限只到 9 元（零钱兜底）。',
                    '<b>商品管理里可以按单个商品免收包赔费。</b>勾了「免收」的商品，买家实付就是标价本身 —— 这是单个商品的例外口径，不改这里的全局费率。',
                    '<b>通道费由平台承担，不进任何一条算式。</b>它是平台付给收款渠道的成本，只在订单详情里列出来供对账。',
                    '<b>改了只影响之后的单。</b>历史单是成交那一刻的快照，不回写 —— 拿新费率重算历史单等于把已经对过的账推翻。',
                ]}
            />
            {isPending ? (
                <div style={{ padding: 40, textAlign: 'center' }}>
                    <Spin size="large" />
                </div>
            ) : data ? (
                <TradeRulesForm initial={data} />
            ) : (
                <Banner type="danger" description="交易规则读取失败，请刷新页面重试" />
            )}
        </PageContainer>
    );
}
