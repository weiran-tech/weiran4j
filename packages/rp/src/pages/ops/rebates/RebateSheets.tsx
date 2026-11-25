import { Button } from '@douyinfe/semi-ui';
import type { ReactNode } from 'react';
import type { OpsConfig, OpsOrderRow, OpsRebateRow, OpsUserRow } from '@/hooks/queries/ops';
import {
    OpsDetailSheet,
    OpsKv,
    OpsPlainTag,
    OpsSection,
    OpsStatusTag,
    gmvText,
    levelText,
    money,
    rebateBase,
    rebateCalcText,
} from '../ops';

/** 返利详情：返利单 / 订单 / 返利关系 / 规则与金额 / 操作记录 */
export function RebateDetailSheet({
    row,
    users,
    orders,
    config,
    onAdjust,
    onPass,
    onViewOrder,
    onClose,
}: {
    row: OpsRebateRow;
    users: OpsUserRow[];
    orders: OpsOrderRow[];
    config: OpsConfig | undefined;
    onAdjust: () => void;
    onPass: () => void;
    onViewOrder: () => void;
    onClose: () => void;
}) {
    const base = rebateBase(row);
    const cut = row.mode === 'rate' && Math.abs(base - row.amount) > 0.001;
    const logs = [...row.logs].sort((a, b) => b.time.localeCompare(a.time));
    const order = orders.find((item) => item.code === row.orderCode);

    const userText = (uid: string): ReactNode => {
        const user = users.find((item) => item.uid === uid);
        return user ? (
            <>
                {user.nickname}
                <span className="ops-sub"> · {uid}</span>
            </>
        ) : (
            <span className="ops-mono">{uid}</span>
        );
    };

    return (
        <OpsDetailSheet
            visible
            title={`返利详情 · ${row.code}`}
            onClose={onClose}
            footer={
                <>
                    <Button onClick={onViewOrder}>查看订单</Button>
                    {row.status === '待审核' && (
                        <>
                            <Button onClick={onAdjust}>修改返利金额</Button>
                            <Button type="primary" theme="solid" onClick={onPass}>
                                确认返利
                            </Button>
                        </>
                    )}
                </>
            }
        >
            <OpsSection title="返利单" />
            <OpsKv
                items={[
                    ['返利单号', <span className="ops-mono">{row.code}</span>],
                    ['状态', <OpsStatusTag value={row.status} />],
                    ['返利来源', <OpsPlainTag value={row.origin} brand={row.origin === '专属'} />],
                    ['返利类目', <OpsPlainTag value={row.category} brand={row.category === '账号'} />],
                    ['用户等级', levelText(config?.levels, row.level)],
                    ...(row.supplementName ? ([['补发名称', row.supplementName]] as [string, ReactNode][]) : []),
                    ['生成时间', row.createdAt],
                    ['返利时间', row.paidAt ? row.paidAt : <span className="ops-sub">—</span>],
                ]}
            />
            <OpsSection title="订单信息" />
            <OpsKv
                items={[
                    ['订单编号', <span className="ops-mono">{row.orderCode}</span>],
                    ['商品标题', order?.title ?? '—'],
                    ['订单金额', <span className="ops-money">{gmvText(row.price)}</span>],
                    [
                        '订单利润',
                        <>
                            <span className="ops-money">{money(row.profit)}</span>
                            {config && (
                                <span className="ops-sub">
                                    {' '}
                                    · 利润门槛 {money(config.profitThreshold)}，低于门槛不返利
                                </span>
                            )}
                        </>,
                    ],
                ]}
            />
            <OpsSection title="返利关系" />
            <OpsKv
                items={[
                    ['买家（下单填码）', userText(row.buyerUid)],
                    ['返利对象', userText(row.inviterUid)],
                    [
                        '邀请关系来源',
                        <>
                            <OpsPlainTag value={row.relation} brand={row.relation === '下单改填'} />
                            <span className="ops-sub">
                                {' '}
                                ·{' '}
                                {row.relation === '下单改填'
                                    ? `买家下单时填写邀请码（${row.codeAt}），覆盖注册时的邀请人`
                                    : row.relation === '客服补录'
                                      ? '客服核实后手动补录返利对象'
                                      : row.relation === '补发'
                                        ? '在原返利单基础上补发'
                                        : '买家未在下单时填写邀请码，沿用注册时绑定的邀请人'}
                            </span>
                        </>,
                    ],
                ]}
            />
            <OpsSection title="返利规则与金额" />
            <OpsKv
                items={[
                    [
                        '返利规则',
                        <>
                            <OpsPlainTag value={row.origin} brand={row.origin === '专属'} />
                            <span className="ops-sub">
                                {' '}
                                ·{' '}
                                {row.origin === '手动' || row.origin === '补发'
                                    ? '手动指定金额'
                                    : rebateCalcText(row.mode, row.rate, row.amount)}
                            </span>
                        </>,
                    ],
                    ...(row.mode === 'rate'
                        ? ([
                              [
                                  '系统计算值',
                                  <span className="ops-money">
                                      {money(row.price)} × {row.rate}% = {money(base)}
                                  </span>,
                              ],
                          ] as [string, ReactNode][])
                        : []),
                    [
                        '实际返利金额',
                        <>
                            <span className="ops-money">{money(row.amount)}</span>
                            {cut && <span className="ops-sub"> · 已由 {money(base)} 调整</span>}
                        </>,
                    ],
                    ...(row.internalRemark
                        ? ([
                              [
                                  '内部备注',
                                  <>
                                      <span>{row.internalRemark}</span>
                                      <span className="ops-sub"> · 用户不可见</span>
                                  </>,
                              ],
                          ] as [string, ReactNode][])
                        : []),
                ]}
            />
            {logs.length > 0 && (
                <>
                    <OpsSection title="操作记录" />
                    <div className="ops-kv">
                        {logs.map((log) => (
                            <div key={`${log.time}-${log.action}`} style={{ display: 'contents' }}>
                                <div className="ops-kv__k">{log.time}</div>
                                <div className="ops-kv__v">
                                    {log.action}
                                    <span className="ops-sub"> · {log.operator} · {log.remark}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </>
            )}
        </OpsDetailSheet>
    );
}
