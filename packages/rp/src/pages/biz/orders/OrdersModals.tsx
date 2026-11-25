import { SideSheet } from '@douyinfe/semi-ui';
import type { ReactNode } from 'react';
import {
    ORDER_ST,
    WD_ST,
    acctBadText,
    acctMask,
    acctOk,
    acctTypeName,
    acctTypeOf,
    feeOf,
    money,
    platFeeOf,
} from '@/biz/biz-dict';
import type {
    BizAccountView,
    BizChannelView,
    BizOrderView,
    BizPaymentView,
    BizPayoutAccountView,
    BizWithdrawalView,
    TradeFeeRule,
} from '@/types/biz';
import { useBizRows } from '@/hooks/queries/biz';
import { BizStatus, BizToneTag } from '../shared';

/**
 * 订单相关弹窗（业务后台共用）。
 *
 * 「登记打款」「创建线下单」随订单管理一起迁到了「商品与订单 → 订单管理」，
 * 这里只剩各收付 / 财务页共用的表单行、时间工具与订单详情抽屉。
 */

export function nowText(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 表单一行：标签 + 控件 + 可选说明。不用 Semi Form，避免与受控状态绕在一起 */
export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
            {children}
            {hint ? (
                <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>{hint}</div>
            ) : null}
        </div>
    );
}

/* ---------- 订单详情 ---------- */

/**
 * 订单详情（2026-11-16 按业务方样例重排为五块）。
 *
 * 从上到下：订单信息 → 时间信息 → 资金明细 → 收款账户 → 出款账户，
 * 其后才是「出款进度」与「线下打款」。
 *
 * 五块的分工很明确：前三块回答「这笔单是什么、什么时候到哪一步、钱怎么算」，
 * 后两块回答「钱从哪个号进来、又从哪个号出去」—— 把账户放进资金明细里，
 * 会让一张单同时出现两组账号，对账时按哪一组都不对。
 */

/** 金额行：左侧是名目（可带小字口径），右侧是数字 */
function MoneyRow({ label, hint, value, dim }: { label: string; hint?: ReactNode; value: ReactNode; dim?: boolean }) {
    return (
        <div className="biz-money-row">
            <span>
                {label}
                {hint ? <span className="biz-dim"> {hint}</span> : null}
            </span>
            <b className="biz-num" style={dim ? { color: 'var(--color-text-tertiary)', fontWeight: 500 } : undefined}>
                {value}
            </b>
        </div>
    );
}

/** 账户块：主体 / 账号（前后脱敏）+ 类型与状态。订单详情里不放完整账号 —— 客服看单不需要完整卡号 */
function AcctBlock({ account, note }: { account?: BizAccountView | undefined; note: string }) {
    if (!account) return <div className="biz-dim" style={{ fontSize: 12, lineHeight: 1.8 }}>{note}</div>;
    const bad = acctBadText(account);
    return (
        <div className={`biz-acct-card${bad ? ' biz-acct-card--bad' : ''}`}>
            <div className="biz-acct-card__row">
                <span>主体</span>
                <b>{account.subject}</b>
            </div>
            <div className="biz-acct-card__row">
                <span>账户</span>
                <b className="biz-mono">{acctMask(account.acct)}</b>
            </div>
            <div className="biz-acct-card__row">
                <span>类型</span>
                <span>
                    <BizToneTag tone={acctTypeOf(account.type)?.tone ?? 'neutral'}>{acctTypeName(account.type)}</BizToneTag>
                    {account.bank ? <span className="biz-dim"> {account.bank}</span> : null}
                </span>
            </div>
            <div className="biz-acct-card__row">
                <span>状态</span>
                <span>
                    {acctOk(account) ? (
                        <BizToneTag tone="ok">正常 · 未冻结</BizToneTag>
                    ) : (
                        <BizToneTag tone="danger">{bad}</BizToneTag>
                    )}
                </span>
            </div>
        </div>
    );
}

export function OrderDetailDrawer({
    order,
    payment,
    withdrawal,
    feePct,
    guarRule,
    onClose,
}: {
    order: BizOrderView;
    payment?: BizPaymentView | undefined;
    withdrawal?: BizWithdrawalView | undefined;
    feePct: number;
    /** 包赔费整条规则（费率 + 上下限）：向买家收、归平台，不进卖家货款 */
    guarRule?: TradeFeeRule | undefined;
    onClose: () => void;
}) {
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const { data: channels = [] } = useBizRows<BizChannelView>('bizChannel');
    const { data: payouts = [] } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');

    /* 四行的收付对象各不相同（2026-11-17）：
       买家实付 = 订单金额 + 包赔费；平台服务费从卖家货款扣；包赔费买家付、归平台；
       通道费平台承担。所以**卖家预计实收 = 订单金额 − 平台服务费**，与包赔费无关。 */
    const plat = platFeeOf(order.amt, feePct);
    /* 包赔费走 feeOf（含最低 / 最高），与交易规则页的试算、商品编辑弹窗同一个算法 */
    const guar = feeOf(order.amt, guarRule);
    const guarPct = guarRule?.feePct ?? 0;
    const buyerPay = +(order.amt + guar).toFixed(2);
    const net = +(order.amt - plat).toFixed(2);

    /* 通道费：按这一单实际走的收款渠道费率算 —— 同一笔支付宝，走直付通和走三方费率不同。
       它由平台承担，不进卖家实收的算式，只在这里列出来供对账。 */
    const chanRow = channels.find((c) => c.alias === payment?.channel || c.code === payment?.channel);
    const chan = chanRow ? +((order.amt * (Number(chanRow.rate) || 0)) / 1000).toFixed(2) : 0;
    const chanRateText = chanRow ? `${chanRow.rate}‰` : '';

    /* 收款账户：从支付单落的那条渠道反查它引用的账户 */
    const recvAcct = chanRow ? accounts.find((a) => a.code === chanRow.acct) : undefined;
    /* 出款账户：提现单上记的是账户摘要，按摘要找回账户；找不到就只显示摘要文字 */
    const payAcct = withdrawal ? payouts.find((p) => p.acctLabel === withdrawal.account) : undefined;
    const payAcctRef = payAcct ? accounts.find((a) => a.code === payAcct.acct) : undefined;

    return (
        <SideSheet title={`订单详情 · ${order.code}`} visible width={660} onCancel={onClose}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
                <BizToneTag tone={order.ch === 'offline' ? 'violet' : 'brand'}>{order.ch === 'offline' ? '线下单' : '渠道单'}</BizToneTag>
                <BizStatus dict={ORDER_ST} value={order.state} />
            </div>

            <div className="biz-section-title">订单信息</div>
            <dl className="biz-dl">
                <dt>订单编号</dt>
                <dd className="biz-mono">{order.code}</dd>
                <dt>商品编号</dt>
                <dd className="biz-mono">{order.goodsId || '—'}</dd>
                <dt>商品标题</dt>
                <dd>{order.item}</dd>
                <dt>买方 ID</dt>
                <dd>
                    {order.buyer}
                    {order.sellerId ? null : <span className="biz-dim"> （散客）</span>}
                </dd>
                <dt>卖方 ID</dt>
                <dd>
                    {order.seller}
                    {order.sellerId ? <span className="biz-dim biz-mono"> {order.sellerId}</span> : <span className="biz-dim"> （示例自营）</span>}
                </dd>
                <dt>价格</dt>
                <dd className="biz-num">
                    <b>¥ {money(order.amt)}</b>
                </dd>
                <dt>当前状态</dt>
                <dd>
                    <BizStatus dict={ORDER_ST} value={order.state} />
                </dd>
            </dl>

            <div className="biz-section-title">时间信息</div>
            <dl className="biz-dl">
                <dt>支付完成时间</dt>
                <dd className="biz-num">{order.payAt || <span className="biz-dim">还没收到钱</span>}</dd>
                <dt>交易完成时间</dt>
                <dd className="biz-num">
                    {order.confirmedAt || <span className="biz-dim">买家还没确认</span>}
                    {order.confirmedAt ? <span className="biz-dim"> 买家在交易群确认收货</span> : null}
                </dd>
                <dt>取消交易时间</dt>
                <dd className="biz-num">{order.cancel?.at || '—'}</dd>
                <dt>申请售后时间</dt>
                <dd className="biz-num">{order.afterSaleAt || '—'}</dd>
            </dl>

            <div className="biz-section-title">资金明细</div>
            <div className="biz-money">
                <MoneyRow label="买家实付" hint={guar > 0 ? `订单 ¥${money(order.amt)} + 包赔费` : undefined} value={`¥ ${money(buyerPay)}`} />
                <MoneyRow
                    label="平台服务费"
                    hint={`${feePct}%（从卖家货款扣）`}
                    value={plat > 0 ? `− ¥ ${money(plat)}` : '¥ 0.00'}
                />
                <MoneyRow
                    label="包赔费"
                    hint={`${guarPct}%（买家付、归平台，平台承担赔付）`}
                    value={`+ ¥ ${money(guar)}`}
                />
                <MoneyRow
                    label="通道费"
                    hint={`${chan > 0 ? `${chanRateText} · ` : ''}由平台承担，不扣卖家`}
                    value={`¥ ${money(chan)}`}
                    dim
                />
                <MoneyRow label="卖家预计实收" value={`¥ ${money(net)}`} />
            </div>
            <div className="biz-dim" style={{ fontSize: 11, lineHeight: 1.7, margin: '4px 0 4px' }}>
                卖家预计实收 = 订单金额 − 平台服务费，与提现单金额同一个数，<b>与包赔费无关</b>。
                包赔费向买家收、归平台；通道费是平台付给收款渠道的成本，只列在这里供对账。
                {order.state === 'trade_done' ? '这一单已交易完成，上面是最终金额。' : '还没交易完成，最终金额以确认收货那一刻的配置快照为准。'}
            </div>

            <div className="biz-section-title">收款账户</div>
            <AcctBlock
                account={recvAcct}
                note={
                    order.ch === 'offline'
                        ? '线下单没有渠道收款账户 —— 钱由买家线下打给商户，登记在收款登记里。'
                        : payment
                          ? '这一单的支付单还没落通道，找不到收款账户。'
                          : '这一单还没收到钱，没有收款账户。'
                }
            />

            <div className="biz-section-title">出款账户</div>
            <AcctBlock
                account={payAcctRef}
                note={
                    order.ch === 'offline'
                        ? '线下单不生成提现单：钱在商户收款账户，由客服线下打款并留凭证。'
                        : !order.sellerId
                          ? '自营单不分账，货款进商户收款账户，没有出款账户。'
                          : withdrawal
                            ? `还没落具体的出款账户，提现单上记的是「${withdrawal.account || '—'}」。`
                            : '还没有出款账户 —— 买家确认收货那一刻系统才建账号提现单并选定账户。'
                }
            />

            <div className="biz-section-title">出款进度</div>
            <dl className="biz-dl">
                <dt>支付单号</dt>
                <dd className="biz-mono">
                    {order.payCode || '—'}
                    {order.payCode && !payment ? <span className="biz-danger"> 支付单不存在（回调未落地或单据被删）</span> : null}
                </dd>
                {payment ? (
                    <>
                        <dt>支付渠道</dt>
                        <dd>
                            {payment.payway || '—'} <span className="biz-dim">{payment.channel || '未落通道'}</span>
                        </dd>
                        <dt>三方流水号</dt>
                        <dd className="biz-mono">{payment.tradeNo || '渠道未给回执'}</dd>
                        <dt>已退 / 在途</dt>
                        <dd className="biz-num">
                            ¥ {money(payment.refunded)} / ¥ {money(payment.inflight)}
                        </dd>
                    </>
                ) : null}
                {order.ch === 'offline' ? (
                    <>
                        <dt>打款状态</dt>
                        <dd>
                            {order.offlinePay?.state === 'done' ? (
                                <span>
                                    已线下打款 · {order.offlinePay.at}
                                    <div className="biz-dim">
                                        流水 {order.offlinePay.no} · 凭证 {order.offlinePay.proof}
                                    </div>
                                </span>
                            ) : (
                                <span className="biz-warn">待商户打款（我们自己的待办）</span>
                            )}
                        </dd>
                    </>
                ) : (
                    <>
                        <dt>提现单</dt>
                        <dd>
                            {withdrawal ? (
                                <span>
                                    <span className="biz-mono">{withdrawal.code}</span>{' '}
                                    <BizStatus dict={WD_ST} value={withdrawal.state} />
                                    {withdrawal.state === 'merged' && withdrawal.mergedInto ? (
                                        <div className="biz-dim">已并入 {withdrawal.mergedInto}，状态看那张单</div>
                                    ) : null}
                                </span>
                            ) : (
                                <span className="biz-warn">还没有提现单（系统在确认收货时自动建）</span>
                            )}
                        </dd>
                    </>
                )}
            </dl>

            {order.cancel ? (
                <>
                    <div className="biz-section-title">取消交易</div>
                    <dl className="biz-dl">
                        <dt>取消时间</dt>
                        <dd className="biz-num">{order.cancel.at}</dd>
                        <dt>原因</dt>
                        <dd>
                            {order.cancel.reason}
                            <span className="biz-dim">
                                {' '}
                                责任方{' '}
                                {order.cancel.fault === 'seller' ? '卖家' : order.cancel.fault === 'buyer' ? '买家' : '系统'}
                            </span>
                        </dd>
                        <dt>退款金额</dt>
                        <dd className="biz-num">
                            ¥ {money(order.cancel.refundAmt)}
                            <span className="biz-dim"> 全额原路退回</span>
                        </dd>
                        <dt>操作人</dt>
                        <dd>{order.cancel.by}</dd>
                        {order.cancel.remark ? (
                            <>
                                <dt>备注</dt>
                                <dd>{order.cancel.remark}</dd>
                            </>
                        ) : null}
                        <dt>退款单</dt>
                        <dd className="biz-mono">{order.cancel.refundCode || '—'}</dd>
                    </dl>
                </>
            ) : null}

            <div className="biz-calc" style={{ marginTop: 16 }}>
                <b>交易完成不在这里确认</b> —— 由买家在 C 端交易群点确认，商户只读结果。
                渠道单的到款进度是一张提现单，去「提现管理」看，这页只给一个指针。
            </div>
        </SideSheet>
    );
}

/* ---------- 登记打款（线下单） ---------- */
