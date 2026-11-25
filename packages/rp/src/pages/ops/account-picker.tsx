import { Select } from '@douyinfe/semi-ui';
import type { ReactNode } from 'react';
import { acctBadText, acctMask, acctOk, acctTypeName, wayName } from '@/biz/biz-dict';
import { useBizRows } from '@/hooks/queries/biz';
import type { BizAccountView, BizChannelView, BizPayoutAccountView } from '@/types/biz';

/**
 * 运营后台的「收款商户 / 出款账户」选择器。
 *
 * 数据来自商户后台的账户台账（`bizAccount`）、收款渠道（`bizChannel`）与出款账户
 * （`bizPayoutAccount`）—— 账户是「全站唯一台账」，运营这边只是换个地方选它，
 * 不另建一套，否则同一张卡会有两份记录，改了一处忘另一处时对不上账。
 *
 * 一条原则：**列出全部主体，不按状态过滤**（2026-11-16 业务定）。
 * 账户异常 / 冻结只影响「线上」那一层（渠道凭证失效、钱过不了收银台），
 * 线下走人工转账 / 平台店铺走款，与渠道健康度无关 —— 所以在运营这边选主体时
 * 不该因为主体状态而让人选不到。状态仍会显示出来，供判断，但不当门槛。
 */

export interface ChannelOption {
    value: string;
    label: string;
    /** 主体状态文字（正常 / 已冻结 / 账户异常 / 账户不存在）；空 = 正常 */
    state: string;
    /** 支付方式（微信 / 支付宝 / 线下） */
    pay: string;
    /** 主体 · 账号脱敏 */
    acct: string;
}

/** 收款渠道选项：线上渠道走收银台，线下渠道用于线下单收款 */
export function useChannelOptions(): { options: ChannelOption[]; loading: boolean } {
    const { data: channels = [], isFetching } = useBizRows<BizChannelView>('bizChannel');
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const acctOf = (code: string) => accounts.find((a) => a.code === code);

    const options = channels.map((c) => {
        const acct = acctOf(c.acct);
        const pay =
            c.dock === 'offline' ? '线下' : c.ways[0] ? wayName(c.ways[0]) : acctTypeName(acct?.type ?? '');
        return {
            value: c.code,
            label: `${c.alias} · ${pay}`,
            state: acct ? acctBadText(acct) : '账户不存在',
            pay,
            acct: acct ? `${acct.subject} · ${acctMask(acct.acct)}` : '账户不存在',
        };
    });
    return { options, loading: isFetching };
}

export interface PayoutOption {
    value: string;
    label: string;
    /** 主体状态文字；空 = 正常 */
    state: string;
    acct: string;
}

/** 出款账户选项：每种到账方式只启用一条，但这里列出全部，让人看清还有哪些备选 */
export function usePayoutOptions(): { options: PayoutOption[]; loading: boolean } {
    const { data: payouts = [], isFetching } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const acctOf = (code: string) => accounts.find((a) => a.code === code);

    const options = payouts.map((p) => {
        const acct = acctOf(p.acct);
        return {
            value: p.code,
            label: `${p.alias || p.code} · ${acctTypeName(acct?.type ?? p.way)}${p.wd ? ' · 已启用' : ''}`,
            state: acct ? acctBadText(acct) : '账户不存在',
            acct: acct ? `${acct.subject} · ${acctMask(acct.acct)}` : '账户不存在',
        };
    });
    return { options, loading: isFetching };
}

/**
 * 选中项的摘要：主体 + 账号，让操作者在选完之后还能确认选对了哪个。
 *
 * 主体状态照实显示，但**不阻断提交** —— 线下流程不依赖渠道健康度，
 * 线上流程在真的走不通时由业务侧反馈，不该在这里提前拦人。
 */
function Summary({ text, state }: { text: string; state: string }) {
    if (!text) return null;
    return (
        <div className={`ops-pick-sum${state ? ' ops-pick-sum--muted' : ''}`}>
            <span>{text}</span>
            {state ? <span className="ops-pick-sum__state">主体{state}</span> : null}
        </div>
    );
}

/** 收款商户字段：选项按「可用优先」排，不可用的排后面并标原因 */
export function ChannelSelect({
    value,
    onChange,
    label = '收款商户',
    hint,
    filterOffline,
}: {
    value: string;
    onChange: (next: string) => void;
    label?: string;
    hint?: ReactNode;
    /** 渠道单只走线上；线下单要选线下渠道 */
    filterOffline?: boolean;
}) {
    const { options } = useChannelOptions();
    const pool = filterOffline === undefined
        ? options
        : options.filter((o) => (filterOffline ? o.pay === '线下' : o.pay !== '线下'));
    const cur = pool.find((o) => o.value === value);
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>{label}</div>
            <Select
                value={value || undefined}
                onChange={(v) => onChange(String(v ?? ''))}
                placeholder={pool.length ? '选择这笔钱进哪条渠道' : '还没有可用的收款渠道'}
                style={{ width: '100%' }}
                filter
                optionList={pool.map((o) => ({ label: o.label, value: o.value }))}
            />
            {hint ? <div className="ops-form-hint">{hint}</div> : null}
            <Summary text={cur?.acct ?? ''} state={cur?.state ?? ''} />
        </div>
    );
}

/** 出款账户字段 */
export function PayoutSelect({
    value,
    onChange,
    label = '出款账户',
    hint,
}: {
    value: string;
    onChange: (next: string) => void;
    label?: string;
    hint?: ReactNode;
}) {
    const { options } = usePayoutOptions();
    const cur = options.find((o) => o.value === value);
    return (
        <div style={{ marginBottom: 12 }}>
            <div style={{ marginBottom: 4, fontSize: 13, color: 'var(--semi-color-text-1)' }}>{label}</div>
            <Select
                value={value || undefined}
                onChange={(v) => onChange(String(v ?? ''))}
                placeholder={options.length ? '选择这笔钱从哪个账户打出' : '还没有出款账户'}
                style={{ width: '100%' }}
                filter
                optionList={options.map((o) => ({ label: o.label, value: o.value }))}
            />
            {hint ? <div className="ops-form-hint">{hint}</div> : null}
            <Summary text={cur?.acct ?? ''} state={cur?.state ?? ''} />
        </div>
    );
}

/** 详情页只读展示账户：主体 / 账号 / 类型 / 状态；查不到时说明为什么 */
export function OpsAcctBlock({
    acct,
    emptyText,
}: {
    acct?: { subject: string; acct: string; type: string; bank?: string; normal: boolean; frozen: boolean } | undefined;
    emptyText: string;
}) {
    if (!acct) {
        return (
            <div className="ops-sub" style={{ fontSize: 12, lineHeight: 1.8 }}>
                {emptyText}
            </div>
        );
    }
    const ok = acctOk(acct);
    return (
        <div className={`ops-acct-card${ok ? '' : ' ops-acct-card--bad'}`}>
            <div className="ops-acct-card__row">
                <span>主体</span>
                <b>{acct.subject}</b>
            </div>
            <div className="ops-acct-card__row">
                <span>账户</span>
                <b className="ops-mono">{acctMask(acct.acct)}</b>
            </div>
            <div className="ops-acct-card__row">
                <span>类型</span>
                <span>
                    {acctTypeName(acct.type)}
                    {acct.bank ? <span className="ops-sub"> {acct.bank}</span> : null}
                </span>
            </div>
            <div className="ops-acct-card__row">
                <span>状态</span>
                <span className={ok ? 'ops-ok-t' : 'ops-warn-t'}>{ok ? '正常 · 未冻结' : acctBadText(acct)}</span>
            </div>
        </div>
    );
}

/** 按 code 取账户（详情页用） */
export function useAccountLookup() {
    const { data: accounts = [] } = useBizRows<BizAccountView>('bizAccount');
    const { data: channels = [] } = useBizRows<BizChannelView>('bizChannel');
    const { data: payouts = [] } = useBizRows<BizPayoutAccountView>('bizPayoutAccount');
    return {
        accountOf: (code?: string) => accounts.find((a) => a.code === code),
        channelOf: (code?: string) => channels.find((c) => c.code === code),
        payoutOf: (code?: string) => payouts.find((p) => p.code === code),
    };
}
