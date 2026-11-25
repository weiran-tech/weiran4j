import { Button, Empty, Modal, Space, Tag } from '@douyinfe/semi-ui';
import { useState } from 'react';
import { VERIFY_ST } from '@/biz/biz-dict';
import type { BizAlipay, BizBank, BizLog, VerifyState } from '@/types/biz';
import { BizStatus } from '@/pages/biz/shared';

/**
 * 用户结算信息弹窗（原「用户结算信息」页的弹窗，迁到用户管理后供其复用）。
 *
 * 只做一件事：查这个人的钱收到哪 —— 绑了银行卡还是支付宝、到哪一步、谁在什么时候改过。
 * 结算信息以实名通过为前提，后台只能看、不能改。
 */
export interface SettleSubject {
    /** 用户 ID（业务单号） */
    code: string;
    nick: string;
    real: string;
    idNo: string;
    verify: VerifyState;
    bank: BizBank | null;
    alipay: BizAlipay | null;
    logs: BizLog[];
}

/** 实名是否通过：只有通过才有结算信息可看 */
export const settleReady = (s: { verify: VerifyState }) => s.verify === 'ok';

/** 卡号只留末四位 */
function last4(no: string): string {
    return String(no || '').replace(/\s/g, '').slice(-4);
}

/** 结算信息一句话：绑了什么、到哪一步 —— 列表列与弹窗副标题共用 */
export function settleText(s: SettleSubject): string {
    const parts: string[] = [];
    if (s.bank) {
        parts.push(s.bank.state === 'active' ? `银行卡 ${s.bank.provider} ****${last4(s.bank.no)}` : '银行卡绑定失败');
    }
    if (s.alipay?.account) parts.push(`支付宝 ${s.alipay.account}`);
    return parts.length ? parts.join(' · ') : '未绑定';
}

/* ---------- 银行卡 ---------- */

function BankPane({ subject }: { subject: SettleSubject }) {
    const b = subject.bank;
    if (!b) {
        return (
            <Empty
                title="还没绑银行卡"
                description="用户在 C 端「收款设置」提交卡号后立即生效；三方开户与绑卡在首次提现时完成"
            />
        );
    }
    const steps = ['提交卡号', '平台侧生效（覆盖旧卡）', '提现时按身份证号查开户', '比对渠道卡号（不一致先换卡）'];
    const nowIdx = b.state === 'active' ? 2 : 0;
    return (
        <>
            <dl className="biz-dl">
                <dt>姓名</dt>
                <dd>
                    {b.name}
                    {b.name !== subject.real ? <span className="biz-danger"> 与实名不一致</span> : null}
                </dd>
                <dt>银行卡号</dt>
                <dd className="biz-mono">{b.no}</dd>
                <dt>三方名称</dt>
                <dd>
                    {b.provider} <span className="biz-dim">开户、核卡与出款都由它完成（核卡在提现时）</span>
                </dd>
                <dt>三方用户 id</dt>
                <dd className="biz-mono">
                    {b.uid3 || '未开户'}{' '}
                    <span className="biz-dim">
                        {b.uid3 ? '渠道侧用户标识，按它反查主体与出款' : '首次提现时按身份证号开户'}
                    </span>
                </dd>
                <dt>绑定时间</dt>
                <dd className="biz-num">{b.boundAt}</dd>
                <dt>状态</dt>
                <dd>
                    <BizStatus dict={VERIFY_ST} value={b.state === 'active' ? 'ok' : 'failed'} fallback="—" />
                    {b.state === 'rejected' ? <span className="biz-danger"> 提交被拦，未写入</span> : null}
                </dd>
            </dl>

            <div className="biz-section-title">绑卡流程</div>
            <Space vertical align="start" spacing={6} style={{ width: '100%' }}>
                {steps.map((s, i) => (
                    <span key={s} style={{ fontSize: 13 }}>
                        <Tag color={i <= nowIdx - 1 ? 'green' : 'grey'} size="small">
                            {i + 1}
                        </Tag>{' '}
                        {s}
                    </span>
                ))}
            </Space>
            <div className="biz-calc" style={{ marginTop: 10 }}>
                {b.state === 'active'
                    ? b.uid3
                        ? `已在 ${b.provider} 开户（id ${b.uid3}）→ 提现时比对渠道卡号，一致直接出款`
                        : `平台侧已生效；${b.provider} 侧尚未开户，首次提现时按身份证号开户并绑卡`
                    : '提交时被拦（户名与实名不一致 / 卡号格式不符）→ 未写入，改对后重新提交'}
            </div>
            {b.sync === 'pending' ? (
                <div className="biz-warn" style={{ fontSize: 12, marginTop: 8 }}>
                    换过卡：平台侧已生效，渠道侧的卡号在下一次提现时同步（一致直接出款，不一致先发起渠道侧换卡）。
                </div>
            ) : null}
        </>
    );
}

/* ---------- 支付宝 ---------- */

function AliPane({ subject }: { subject: SettleSubject }) {
    const a = subject.alipay;
    if (!a) {
        return <Empty title="还没填支付宝账号" description="支付宝只登记账号，不需要签约授权" />;
    }
    return (
        <>
            <dl className="biz-dl">
                <dt>姓名</dt>
                <dd>
                    {a.name}
                    {a.name !== subject.real ? <span className="biz-danger"> 与实名不一致，打款会失败</span> : null}
                </dd>
                <dt>支付宝账号</dt>
                <dd className="biz-mono">{a.account || '未填写'}</dd>
                <dt>填写时间</dt>
                <dd className="biz-num">{a.filledAt || '—'}</dd>
                <dt>状态</dt>
                <dd>
                    <BizStatus
                        dict={{ ok: { t: '已填写', tone: 'ok' }, warn: { t: '账号未填写', tone: 'warn' } }}
                        value={a.account ? 'ok' : 'warn'}
                    />
                </dd>
            </dl>
            <div className="biz-calc" style={{ marginTop: 10 }}>
                支付宝只登记账号，没有签约 / 授权这一步。用户填了账号、姓名与实名一致，出款就按这个账号打。
            </div>
        </>
    );
}

/* ---------- 变更日志 ---------- */

function LogsPane({ subject }: { subject: SettleSubject }) {
    const logs = [...subject.logs].sort((a, b) => String(b.at).localeCompare(String(a.at)));
    if (!logs.length) return <Empty title="还没有变更记录" />;
    return (
        <Space vertical align="start" spacing={10} style={{ width: '100%' }}>
            {logs.map((l, i) => (
                <div key={i} style={{ width: '100%' }}>
                    <div style={{ fontSize: 13 }}>
                        <b>{l.act}</b>
                        {l.ok === false ? (
                            <Tag color="red" size="small" style={{ marginLeft: 6 }}>
                                失败
                            </Tag>
                        ) : null}
                    </div>
                    <div className="biz-dim" style={{ fontSize: 12 }}>
                        {l.at} · {l.who}
                    </div>
                    {l.note ? <div style={{ fontSize: 12, lineHeight: 1.7, marginTop: 2 }}>{l.note}</div> : null}
                </div>
            ))}
        </Space>
    );
}

export type SettleTab = 'bank' | 'ali' | 'logs';

export function SettleDetailModal({
    subject,
    initialTab = 'bank',
    onClose,
}: {
    subject: SettleSubject;
    /** 点「结算信息」进来看银行卡，点「日志」直接落在变更日志 */
    initialTab?: SettleTab;
    onClose: () => void;
}) {
    const [tab, setTab] = useState<SettleTab>(initialTab);
    return (
        <Modal
            title={`结算信息 · ${subject.nick}`}
            visible
            width={660}
            onCancel={onClose}
            footer={
                <Space>
                    <Button onClick={onClose}>关闭</Button>
                </Space>
            }
        >
            <div className="biz-dim" style={{ fontSize: 12, marginBottom: 10 }}>
                {subject.code} · {VERIFY_ST[subject.verify]?.t ?? subject.verify}
                {settleReady(subject) ? ` · ${settleText(subject)}` : ' · 实名未通过'}
            </div>
            <div className="biz-tabs" style={{ padding: '0 0 10px', borderBottom: '1px solid var(--color-border)' }}>
                {([
                    ['bank', '银行卡'],
                    ['ali', '支付宝'],
                    ['logs', '变更日志'],
                ] as const).map(([k, t]) => (
                    <button
                        key={k}
                        type="button"
                        className={`biz-tabs__item${tab === k ? ' biz-tabs__item--on' : ''}`}
                        onClick={() => setTab(k)}
                    >
                        {t}
                    </button>
                ))}
            </div>
            <div style={{ marginTop: 14 }}>
                {tab === 'bank' ? <BankPane subject={subject} /> : tab === 'ali' ? <AliPane subject={subject} /> : <LogsPane subject={subject} />}
            </div>
            <div className="biz-calc" style={{ marginTop: 16 }}>
                <b>这一侧只读。</b>结算信息由用户本人在 C 端维护，后台能看、能核，不能代填 ——
                能代填就能把货款导到别人的卡上。要改只能由用户自己重新绑定。
            </div>
        </Modal>
    );
}
