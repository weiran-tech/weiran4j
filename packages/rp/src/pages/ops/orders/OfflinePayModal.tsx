import { Button, Input, Modal, Space, Toast } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { useOpsAction } from '@/hooks/queries/ops';
import type { OpsOrderRow } from '@/hooks/queries/ops';
import { money } from '../ops';
import { PayoutSelect } from '../account-picker';

function nowText(): string {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 表单一行：标签 + 控件 + 可选说明（与运营后台其他弹窗同一套内联写法） */
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, color: 'var(--color-text-secondary)', marginBottom: 4 }}>{label}</div>
            {children}
            {hint ? <div style={{ fontSize: 11, color: 'var(--color-text-secondary)', marginTop: 4, lineHeight: 1.6 }}>{hint}</div> : null}
        </div>
    );
}

/**
 * 线下单登记打款（从原订单管理迁过来）。
 *
 * 线下单没有支付单、也不走渠道代付：钱由运营用自己的账户打给卖家，
 * **凭证就是这笔出款的回执**。登记完成后这一单的出款状态变「已线下打款」。
 */
export function OfflinePayModal({ row, onClose }: { row: OpsOrderRow; onClose: () => void }) {
    const action = useOpsAction('order');
    // 预填上次已登记的内容：运营常常先记下流水号、晚些才拿到回执截图，
    // 再打开时不该把已经填过的清空。
    const [no, setNo] = useState(row.offlinePay?.no ?? '');
    const [at, setAt] = useState(row.offlinePay?.at || nowText());
    const [proof, setProof] = useState(row.offlinePay?.proof ?? '');
    const [by, setBy] = useState(row.offlinePay?.by || '运营-财务');
    const [payout, setPayout] = useState(row.payoutAcct ?? '');
    const [error, setError] = useState('');

    /** 缺哪一项 —— 半填的线下单要在弹窗里说清楚还差什么 */
    const missing = [!no.trim() && '打款流水号', !proof.trim() && '到账凭证'].filter(Boolean) as string[];

    const submit = async () => {
        if (!no.trim()) {
            Toast.warning('请填写打款流水号');
            return;
        }
        if (!proof.trim()) {
            Toast.warning('请填写到账凭证');
            return;
        }
        // 出款账户必选：钱从哪个号打出去的，是这笔出款的另一半事实（另一半是凭证）
        if (!payout) {
            setError('请选择出款账户');
            return;
        }
        await action.mutateAsync({
            action: 'offlinePay',
            id: row.id,
            body: { no: no.trim(), at, proof: proof.trim(), by: by.trim(), payoutAcct: payout },
        });
        Toast.success('已登记打款');
        onClose();
    };

    return (
        <Modal
            visible
            title="登记打款"
            width={560}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>取消</Button>
                    <Button type="primary" theme="solid" loading={action.isPending} onClick={() => void submit().catch(() => undefined)}>
                        确认已打款
                    </Button>
                </Space>
            }
        >
            <div className="ops-sub" style={{ fontSize: 12, marginBottom: 12 }}>
                {row.code} · {row.title} · 应打 {money(row.price)}
            </div>
            {missing.length ? (
                <div
                    style={{
                        fontSize: 12,
                        marginBottom: 12,
                        padding: '6px 10px',
                        borderRadius: 6,
                        background: 'var(--color-semi-orange-light-default, #fff7e8)',
                        color: 'var(--color-semi-orange-6, #a15c00)',
                    }}
                >
                    待补：{missing.join('、')}
                    {no.trim() ? '（流水号已登记，凭证还没上传）' : ''}
                </div>
            ) : null}
            <Field label="打款流水号（必填）">
                <Input placeholder="银行 / 支付宝流水号，如 CMB202610191030221" value={no} onChange={setNo} />
            </Field>
            <Field label="打款时间">
                <Input value={at} onChange={setAt} />
            </Field>
            <Field label="到账凭证（必填）" hint="凭证就是回执：系统拿不到渠道回执，没有凭证无法证明钱打过了">
                <Input placeholder="如 打款凭证-AL20261018000859.jpg" value={proof} onChange={setProof} />
            </Field>
            <PayoutSelect
                value={payout}
                onChange={(v) => {
                    setPayout(v);
                    setError('');
                }}
                hint="这笔钱从哪个账户打给卖家。登记之后可以在订单详情里查到。"
            />
            <Field label="操作人">
                <Input value={by} onChange={setBy} />
            </Field>
            {error ? <div className="ops-form-hint" style={{ color: 'var(--semi-color-danger)' }}>{error}</div> : null}
            <div className="ops-note-line" style={{ fontSize: 12, color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
                线下单不走渠道代付，钱从运营自有账户打出 —— <b>凭证就是回执</b>。
                买家已确认收货，登记完成后订单转为<b>已完成</b>，交易结束。
            </div>
        </Modal>
    );
}
