import { Button, Input, InputNumber, Modal, Select, Space, TextArea, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsConfig, OpsOrderRow, OpsRebateRow, OpsUserRow } from '@/hooks/queries/ops';
import { money, rebateBase } from '../ops';

/** 修改返利金额：审核前可自由调整，确认后按该金额入钱包 */
export function RebateAmountModal({ row, onClose }: { row: OpsRebateRow; onClose: () => void }) {
    const action = useOpsAction('rebate');
    const [amount, setAmount] = useState(row.amount);
    const [error, setError] = useState('');
    const base = rebateBase(row);

    const submit = async () => {
        if (!(amount > 0)) return setError('请输入大于 0 的返利金额');
        const before = row.amount;
        const value = Math.round(amount * 100) / 100;
        await action.mutateAsync({ action: 'adjustAmount', id: row.id, body: { amount: value } });
        Toast.success(`返利金额已由 ${money(before)} 调整为 ${money(value)}`);
        onClose();
    };

    return (
        <Modal
            visible
            title="修改返利金额"
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        保存
                    </Button>
                </Space>
            }
        >
            <div style={{ marginBottom: 12, fontSize: 13 }}>返利单号</div>
            <Input value={row.code} disabled />
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>系统计算值</div>
            <Input
                value={
                    row.mode === 'rate'
                        ? `${money(row.price)} × ${row.rate}% = ${money(base)}`
                        : `每单固定 ${money(base)}`
                }
                disabled
            />
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>返利金额（元）</div>
            <InputNumber
                aria-label="返利金额"
                min={0.01}
                step={0.01}
                precision={2}
                value={amount}
                onChange={(value) => {
                    setAmount(Number(value));
                    setError('');
                }}
                style={{ width: 200 }}
            />
            <div className="ops-form-hint">
                审核前可自由调整，确认后该金额进入用户钱包。当前 {money(row.amount)}。
            </div>
            {error && <div className="ops-form-error">{error}</div>}
        </Modal>
    );
}

/** 手动新增返利：已完成订单补录，无等级 / 忘记填推荐码 / 一单多位返利对象 */
export function ManualRebateModal({
    users,
    config,
    order,
    onClose,
}: {
    users: OpsUserRow[];
    config: OpsConfig;
    /** 从订单列表指定的已完成订单 */
    order: OpsOrderRow;
    onClose: () => void;
}) {
    const action = useOpsAction('rebate');
    const [inviterUid, setInviterUid] = useState('');
    const [amount, setAmount] = useState(10);
    const [remark, setRemark] = useState('');
    const [error, setError] = useState('');

    const submit = async () => {
        if (!inviterUid) return setError('请选择返利对象');
        if (!(amount > 0)) return setError('返利金额需大于 0');
        if (order.profit < config.profitThreshold) {
            return setError(`订单利润 ${money(order.profit)} 低于利润门槛 ${money(config.profitThreshold)}，按规则不返利`);
        }
        await action.mutateAsync({
            action: 'createRebate',
            body: {
                orderCode: order.code,
                inviterUid,
                category: order.category,
                amount: Math.round(amount * 100) / 100,
                profit: order.profit,
                internalRemark: remark,
            },
        });
        Toast.success(
            config.audit
                ? `已新增返利单，确认后 ${money(amount)} 进入用户钱包`
                : `已新增返利单，${money(amount)} 已进入用户钱包`,
        );
        onClose();
    };

    const selectedUser = users.find((user) => user.uid === inviterUid);

    return (
        <Modal
            visible
            title="手动新增返利"
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        保存
                    </Button>
                </Space>
            }
        >
            <div className="ops-form-hint" style={{ marginBottom: 12 }}>
                返利类目：<b>{order.category}</b> ｜ 订单利润：<b>{money(order.profit)}</b>
                （低于 {money(config.profitThreshold)} 不返利）
            </div>
            <div style={{ marginBottom: 6, fontSize: 13 }}>订单</div>
            <div className="ops-cell2">
                <span>
                    {order.code} · {order.title}
                </span>
                <span className="ops-cell2__sub">
                    {money(order.price)} · 买家 {order.buyerUid} · {order.status}
                </span>
            </div>
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>返利对象（用户ID）</div>
            <Select
                placeholder="搜索昵称 / 用户ID"
                filter
                value={inviterUid || undefined}
                onChange={(value) => {
                    setInviterUid(String(value ?? ''));
                    setError('');
                }}
                optionList={users.map((user) => ({
                    label: `${user.nickname}（${user.uid}）${user.level ? ` · ${user.level} 级` : ' · 无等级'}`,
                    value: user.uid,
                }))}
                style={{ width: '100%' }}
            />
            <div className="ops-form-hint">
                {selectedUser
                    ? `${selectedUser.nickname} · ${selectedUser.level ? `${selectedUser.level} 级` : '无等级，按手动金额返利'}`
                    : '支持无等级用户、忘记填推荐码的订单；同一订单可多次新增不同返利对象'}
            </div>
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>返利金额（元）</div>
            <InputNumber
                aria-label="返利金额"
                min={0.01}
                step={1}
                precision={2}
                value={amount}
                onChange={(value) => {
                    setAmount(Number(value));
                    setError('');
                }}
                style={{ width: 200 }}
            />
            <div style={{ margin: '12px 0 6px', fontSize: 13 }}>内部后台备注（用户不可见）</div>
            <TextArea
                placeholder="如：客服核实买家忘记填写推荐码，补录返利"
                value={remark}
                onChange={(value) => setRemark(value)}
                autosize={{ minRows: 2, maxRows: 4 }}
            />
            {error && <div className="ops-form-error">{error}</div>}
        </Modal>
    );
}
