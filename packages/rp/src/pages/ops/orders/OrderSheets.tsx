import { Button, Toast } from '@douyinfe/semi-ui';
import type { ReactNode } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsLog, OpsOrderRow, OpsUserRow } from '@/hooks/queries/ops';
import { feeOf, platFeeOf } from '@/biz/biz-dict';
import { useTradeRule } from '@/hooks/queries/biz';
import type { BizTradeRuleView } from '@/types/biz';
import { OpsDetailSheet, OpsKv, OpsSection, OpsStatusTag, money } from '../ops';
import { OpsAcctBlock, useAccountLookup } from '../account-picker';

/** 订单操作记录：时间字段推导出的交易流程 + 后台手动操作 */
export function orderLogs(row: OpsOrderRow, users?: OpsUserRow[]): OpsLog[] {
    const buyer = users?.find((user) => user.uid === row.buyerUid)?.nickname ?? row.buyerUid;
    const rows: OpsLog[] = [];
    const push = (time: string, action: string, operator: string, remark: string) => {
        if (time) rows.push({ time, action, operator, remark });
    };
    push(row.paidAt, '订单支付', buyer, '买家完成支付，资金进入平台担保');
    push(row.afterSaleAt, '申请售后', buyer, '买家发起售后申请，客服介入');
    push(
        row.canceledAt,
        row.paidAt ? '取消交易' : '订单关闭',
        '系统',
        row.paidAt ? '交易中止，资金原路退回' : '超时未支付，订单自动关闭',
    );
    push(row.doneAt, '交易完成', buyer, '买家确认收货，交易完成');
    return [...rows, ...(Array.isArray(row.logs) ? row.logs : [])];
}

export function OrderDetailSheet({
    row,
    users,
    onClose,
}: {
    row: OpsOrderRow;
    users?: OpsUserRow[];
    onClose: () => void;
}) {
    const buyer = users?.find((user) => user.uid === row.buyerUid);
    const seller = users?.find((user) => user.uid === row.sellerUid);

    /* 账户：收款账户顺着「收款渠道 → 它引用的账户」找；出款账户直接看订单上记的那条 */
    const { accountOf, channelOf, payoutOf } = useAccountLookup();
    const recvChannel = channelOf(row.recvChannel);
    const recvAcct = accountOf(recvChannel?.acct);
    const payout = payoutOf(row.payoutAcct);
    const payoutAcct = accountOf(payout?.acct);

    /* 资金明细读交易规则，不再写死百分比 —— 页面上的数与提现单、C 端文案必须是同一份配置 */
    const { data: tradeRule } = useTradeRule<BizTradeRuleView>();
    const feePct = tradeRule?.trade.feePct ?? 10;
    const guarRule = tradeRule?.guar;
    const guarPct = guarRule?.feePct ?? 0;
    const chanRate = recvChannel?.rate ?? 0;
    const plat = platFeeOf(row.price, feePct);
    /* 包赔费：下单那一刻商品是否「免收」是快照（row.guarFree），费率走全局配置。
       金额必须用同一个 feeOf（含上下限），否则商品弹窗算 ¥10 的小额单，这里会算成 ¥6。 */
    const guar = row.guarFree ? 0 : feeOf(row.price, guarRule);
    // 通道费按这一单实际走的渠道费率算（‰），由平台承担、不扣卖家
    const chan = +((row.price * chanRate) / 1000).toFixed(2);
    /* 四行的收付对象各不相同：买家实付 = 订单 + 包赔费；平台服务费从卖家货款扣；
       包赔费买家付、归平台；通道费平台承担。**卖家预计实收 = 订单 − 平台服务费**。 */
    const buyerPay = +(row.price + guar).toFixed(2);
    const net = +(row.price - plat).toFixed(2);
    const info: [string, ReactNode][] = [
        ['订单编号', <span className="ops-mono">{row.code}</span>],
        ['商品编号', <span className="ops-mono">{row.goodsCode}</span>],
        ['商品标题', row.title],
        ['买方ID', `${row.buyerUid}${buyer ? `（${buyer.nickname}）` : ''}`],
        [
            '卖方ID',
            row.sellerUid ? `${row.sellerUid}${seller ? `（${seller.nickname}）` : ''}` : '—（后台来源商品，无卖方）',
        ],
        ['游戏区服', `${row.game} / ${row.channel} / ${row.region} / ${row.server}`],
        ['游戏账号', <span className="ops-mono">{row.account}</span>],
        ['价格', <span className="ops-money">{money(row.price)}</span>],
        ['当前状态', <OpsStatusTag value={row.status} />],
    ];
    return (
        <OpsDetailSheet visible title={`订单详情 · ${row.code}`} onClose={onClose}>
            <OpsSection title="订单信息" />
            <OpsKv items={info} />
            <OpsSection title="时间信息" />
            <OpsKv
                items={[
                    ['支付完成时间', row.paidAt],
                    ['交易完成时间', row.doneAt],
                    ['取消交易时间', row.canceledAt],
                    ['申请售后时间', row.afterSaleAt],
                ]}
            />
            <OpsSection title="资金明细" />
            <div className="ops-money-box">
                <div className="ops-money-row">
                    <span className="ops-sub">
                        买家实付
                        {guar > 0 ? <span style={{ display: 'block', fontSize: 11 }}>订单 {money(row.price)} + 包赔费</span> : null}
                        {row.orderType === '线下单' && row.receivedAmt !== undefined && row.receivedAmt !== row.price ? (
                            <span style={{ display: 'block', fontSize: 11 }}>
                                线下实收 {money(row.receivedAmt)}（与订单金额差 {money(row.price - row.receivedAmt)}）
                            </span>
                        ) : null}
                    </span>
                    <span className="ops-money">{money(buyerPay)}</span>
                </div>
                <div className="ops-money-row">
                    <span className="ops-sub">平台服务费 {feePct}%</span>
                    <span className="ops-money">{plat > 0 ? `− ${money(plat)}` : money(0)}</span>
                </div>
                <div className="ops-money-row">
                    <span className="ops-sub">
                        包赔费 {row.guarFree ? '免收' : `${guarPct}%`}
                        <span style={{ display: 'block', fontSize: 11 }}>
                            {row.guarFree
                                ? '本商品在下单时设为免收，买家实付 = 订单金额'
                                : '买家付、归平台，平台承担赔付'}
                        </span>
                    </span>
                    <span className="ops-money">+ {money(guar)}</span>
                </div>
                <div className="ops-money-row">
                    <span className="ops-sub">
                        通道费 {chanRate ? `${chanRate}‰` : ''}
                        <span style={{ display: 'block', fontSize: 11 }}>由平台承担，不扣卖家</span>
                    </span>
                    <span className="ops-money ops-sub">{money(chan)}</span>
                </div>
                <div className="ops-money-row ops-money-row--total">
                    <span>卖家预计实收</span>
                    <span className="ops-money">{money(net)}</span>
                </div>
            </div>
            <div className="ops-sub" style={{ fontSize: 11, lineHeight: 1.7, marginTop: -4 }}>
                卖家预计实收 = 订单金额 − 平台服务费，与提现单金额同一个数，与包赔费无关。
                包赔费向买家收、归平台；通道费是平台付给收款渠道的成本，只列在这里供对账。
            </div>

            <OpsSection title="收款账户" />
            <OpsAcctBlock
                acct={recvAcct}
                emptyText={
                    row.orderType === '线下单'
                        ? '线下单不过收银台 —— 钱由买家线下打给商户，收款渠道在转线下单时选定。'
                        : recvChannel
                          ? '这条渠道引用的账户已不存在，到「账户管理」核对。'
                          : '这一单还没记录收款渠道：支付时未选，或订单来自旧数据。'
                }
            />
            {recvChannel ? (
                <div className="ops-sub" style={{ fontSize: 11, marginTop: -2 }}>
                    收款商户：{recvChannel.alias}
                </div>
            ) : null}

            <OpsSection title="出款账户" />
            <OpsAcctBlock
                acct={payoutAcct}
                emptyText={
                    row.orderType === '线下单'
                        ? payout
                          ? '这条出款账户引用的账户已不存在，到「账户管理」核对。'
                          : '还没登记打款 —— 登记时会选出款账户，登记后这里显示它。'
                        : '渠道单由系统自动分账，出款账户在买家确认收货那一刻选定。'
                }
            />
            {payout ? (
                <div className="ops-sub" style={{ fontSize: 11, marginTop: -2 }}>
                    出款账户：{payout.alias || payout.code}
                </div>
            ) : null}

            {row.orderType === '线下单' && (row.recvProof || row.receivedAmt !== undefined) ? (
                <>
                    <OpsSection title="线下收款登记" />
                    <OpsKv
                        items={[
                            ['实收金额', <span className="ops-money">{money(row.receivedAmt ?? row.price)}</span>],
                            ['付款凭证', <span className="ops-mono">{row.recvProof || '—'}</span>],
                            ['支付完成时间', row.paidAt || '—'],
                        ]}
                    />
                </>
            ) : null}
        </OpsDetailSheet>
    );
}

/** 订单群：展示买卖双方与运营的沟通记录，并支持运营发言 */
export function OrderGroupSheet({
    row,
    users,
    onClose,
}: {
    row: OpsOrderRow;
    users?: OpsUserRow[];
    onClose: () => void;
}) {
    const action = useOpsAction('order');
    const buyerName = users?.find((user) => user.uid === row.buyerUid)?.nickname ?? row.buyerUid;
    const sellerName = row.sellerUid ? (users?.find((user) => user.uid === row.sellerUid)?.nickname ?? row.sellerUid) : '—';
    const time = row.paidAt || row.canceledAt || '2026-10-17 10:00';
    const messages = [
        { key: `${time} · 系统`, value: `订单 ${row.code} 已创建，商品：${row.title}` },
        { key: `${time} · ${buyerName}`, value: '已付款，麻烦尽快安排发货。' },
        row.sellerUid
            ? { key: `${time} · ${sellerName}`, value: '收到，正在处理账号交付，稍后发你换绑信息。' }
            : { key: `${time} · 运营-后台`, value: '该商品为平台自营，由运营协助完成账号交付与换绑。' },
        { key: `${time} · 运营-后台`, value: '已进入担保交易流程，交付完成后请买家及时确认收货。' },
    ];
    const members = [`买方 ${buyerName}`, row.sellerUid ? `卖方 ${sellerName}` : '', '运营-后台'].filter(Boolean).join(' · ');

    const send = () => {
        action.mutate(
            { action: 'addLog', id: row.id, body: { actionName: '群内发言', remark: '运营在订单群发言，已同步通知买卖双方' } },
            { onSuccess: () => Toast.success('消息已发送到订单群') },
        );
        onClose();
    };

    return (
        <OpsDetailSheet
            visible
            title={`订单群 · ${row.code}`}
            onClose={onClose}
            footer={<Button type="primary" theme="solid" onClick={send}>发送消息</Button>}
        >
            <OpsSection title="群信息" />
            <OpsKv
                items={[
                    ['订单编号', <span className="ops-mono">{row.code}</span>],
                    ['商品标题', row.title],
                    ['群成员', members],
                ]}
            />
            <OpsSection title="聊天记录" />
            <div className="ops-chat">
                {messages.map((message) => (
                    <div key={message.key} className="ops-chat__item">
                        <span className="ops-chat__meta">{message.key}</span>
                        {message.value}
                    </div>
                ))}
            </div>
            <OpsSection title="说明" />
            <div className="ops-note" style={{ marginBottom: 0 }}>
                群内消息对买卖双方可见，运营发言将同步通知买卖双方。
            </div>
        </OpsDetailSheet>
    );
}
