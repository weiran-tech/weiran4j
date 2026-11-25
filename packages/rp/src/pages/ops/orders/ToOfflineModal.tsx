import { Button, Input, InputNumber, Modal, Space, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsOrderRow } from '@/hooks/queries/ops';
import { money } from '../ops';
import { ChannelSelect } from '../account-picker';

/** 当前时间（YYYY-MM-DD HH:mm），给「支付完成时间」做默认值 */
function nowText(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/**
 * 待支付的渠道单转线下单。
 *
 * 买家没走渠道支付（自己去微信 / 支付宝转了，或干脆线下转账），客服把这笔单改成线下单。
 *
 * 四个必填项各回答一个问题：
 * - **收款商户**：钱进了哪条渠道绑定的账户（不记下来，退款与对账都答不出「这笔进了谁的户」）
 * - **用户付款凭证**：买家转账的截图 / 回执 —— 系统拿不到渠道回执，凭证就是唯一凭据
 * - **实收金额**：实际到账多少，不得高于订单金额（差额另走改价，不在这里抹平）
 * - **支付完成时间**：钱实际是什么时候收到的，线下转账时间不一定等于现在，别替客服猜
 */
export function ToOfflineModal({ row, onClose }: { row: OpsOrderRow; onClose: () => void }) {
    const action = useOpsAction('order');
    const [channel, setChannel] = useState('');
    const [proof, setProof] = useState('');
    const [amt, setAmt] = useState<number | null>(row.price);
    const [payAt, setPayAt] = useState(nowText());
    const [remark, setRemark] = useState('');
    const [error, setError] = useState('');

    const submit = async () => {
        if (!channel) {
            setError('请选择收款商户');
            return;
        }
        if (!proof.trim()) {
            setError('请填写用户付款凭证');
            return;
        }
        if (amt === null || amt <= 0) {
            setError('请填写实收金额');
            return;
        }
        if (amt > row.price) {
            setError(`实收金额不得高于订单金额 ${money(row.price)}；差额需另走改价，不在这里抹平`);
            return;
        }
        if (!payAt.trim()) {
            setError('请填写支付完成时间');
            return;
        }
        await action.mutateAsync({
            action: 'toOffline',
            id: row.id,
            body: {
                recvChannel: channel,
                proof: proof.trim(),
                amt,
                payAt: payAt.trim(),
                remark: `买家未走渠道支付，转为线下单；收款商户 ${channel}，实收 ${money(amt)}，凭证 ${proof.trim()}${
                    remark.trim() ? `；${remark.trim()}` : ''
                }`,
            },
        });
        Toast.success(`${row.code} 已转为线下单`);
        onClose();
    };

    return (
        <Modal
            visible
            title="转线下单"
            width={600}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        确认转为线下单
                    </Button>
                </Space>
            }
        >
            <div className="ops-sub" style={{ fontSize: 12, marginBottom: 12 }}>
                {row.code} · {row.title} · 订单金额 {money(row.price)}
            </div>

            <ChannelSelect
                value={channel}
                onChange={(v) => {
                    setChannel(v);
                    setError('');
                }}
                hint="这笔钱实际进了哪条商户绑定的账户。线下单不过收银台，选错了对账时找不到这笔钱。"
            />

            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>用户付款凭证（必填）</div>
                <Input
                    value={proof}
                    onChange={(v) => {
                        setProof(v);
                        setError('');
                    }}
                    placeholder="如 买家微信转账截图.jpg / CMB20261117093022"
                />
                <div className="ops-form-hint">系统拿不到渠道回执，凭证就是这笔线下收款唯一的凭据</div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>实收金额（必填）</div>
                <InputNumber
                    value={amt ?? ''}
                    min={0.01}
                    max={row.price}
                    precision={2}
                    style={{ width: '100%' }}
                    onChange={(v) => {
                        setAmt(typeof v === 'number' ? v : null);
                        setError('');
                    }}
                />
                <div className="ops-form-hint">实际到账金额，不得高于订单金额 {money(row.price)}；差额需另走改价，不在这里抹平</div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>支付完成时间（必填）</div>
                <Input value={payAt} onChange={setPayAt} placeholder="2026-11-17 09:30" />
                <div className="ops-form-hint">钱实际是什么时候收到的 —— 线下转账时间不一定等于现在，让客服填，别替他猜</div>
            </div>

            <div style={{ marginBottom: 12 }}>
                <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>备注（选填）</div>
                <Input value={remark} onChange={setRemark} placeholder="如 买家微信直转，已核对到账" />
            </div>

            <div className="ops-note-line" style={{ fontSize: 12, color: 'var(--semi-color-text-2)', lineHeight: 1.8 }}>
                <b>转单是不可逆的。</b>渠道侧永远不会收到这笔钱，所以原支付单一并作废 ——
                留着只会一直挂在「待支付」，把支付成功率算错、对账时多一条永远核不掉的单。
                <br />
                转成线下单后订单状态置为<b>已支付</b>，钱从此进所选收款商户绑定的账户；
                买家确认收货后在列表点「登记打款」放款给卖家，平台不出款。
            </div>
            {error ? (
                <div className="ops-form-hint" style={{ color: 'var(--semi-color-danger)', marginTop: 8 }}>
                    {error}
                </div>
            ) : null}
        </Modal>
    );
}
