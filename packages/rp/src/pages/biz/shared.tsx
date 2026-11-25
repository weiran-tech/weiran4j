import { Tag } from '@douyinfe/semi-ui';
import type { ReactNode } from 'react';
import { TONE_COLOR, type DictItem } from '@/biz/biz-dict';
import './biz.css';

/** 字典驱动的状态标签：词典里没有的值原样显示，不吞数据 */
export function BizStatus({
    dict,
    value,
    fallback = '—',
}: {
    dict: Record<string, DictItem>;
    value: string | null | undefined;
    fallback?: ReactNode;
}) {
    const item = value ? dict[value] : undefined;
    if (!item) return <span className="biz-dim">{fallback}</span>;
    return (
        <Tag color={TONE_COLOR[item.tone]} size="small">
            {item.t}
        </Tag>
    );
}

/** 纯色标签：对接类型、到账方式这类「分类」而不是「状态」的值 */
export function BizToneTag({ tone, children }: { tone: keyof typeof TONE_COLOR; children: ReactNode }) {
    return (
        <Tag color={TONE_COLOR[tone]} size="small">
            {children}
        </Tag>
    );
}

export interface KpiItem {
    label: string;
    value: ReactNode;
    unit?: string;
    desc?: ReactNode;
    alert?: boolean;
    /** 数字类可以用小一号字，避免长金额把卡片撑破 */
    compact?: boolean;
}

export function KpiRow({ items }: { items: KpiItem[] }) {
    return (
        <div className="biz-kpis">
            {items.map((it) => (
                <div key={it.label} className={`biz-kpi${it.alert ? ' biz-kpi--alert' : ''}`}>
                    <div className="biz-kpi__k">{it.label}</div>
                    <div className="biz-kpi__v" style={it.compact ? { fontSize: 20 } : undefined}>
                        {it.value}
                        {it.unit ? <small>{it.unit}</small> : null}
                    </div>
                    {it.desc ? <div className="biz-kpi__d">{it.desc}</div> : null}
                </div>
            ))}
        </div>
    );
}

/** 统计口径：默认收起。KPI 卡上的每个数都要能说清「算什么、不算什么」 */
export function StatRules({ items }: { items: ReactNode[] }) {
    if (!items.length) return null;
    return (
        <details className="biz-rules">
            <summary>
                统计规则 · {items.length} 条口径
            </summary>
            <ul>
                {items.map((it, i) => (
                    <li key={i}>{it}</li>
                ))}
            </ul>
        </details>
    );
}

export interface TabItem {
    key: string;
    label: string;
    count?: number;
}

/** 列表上方的一条页签（带计数）；右侧可挂一句说明 */
export function BizTabs({
    items,
    value,
    onChange,
    hint,
}: {
    items: TabItem[];
    value: string;
    onChange: (key: string) => void;
    hint?: ReactNode;
}) {
    return (
        <div className="biz-tabs" role="tablist">
            {items.map((it) => (
                <button
                    key={it.key}
                    type="button"
                    role="tab"
                    aria-selected={value === it.key}
                    className={`biz-tabs__item${value === it.key ? ' biz-tabs__item--on' : ''}`}
                    onClick={() => onChange(it.key)}
                >
                    {it.label}
                    {it.count === undefined ? null : <em className="biz-tabs__n">{it.count}</em>}
                </button>
            ))}
            {hint ? <span className="biz-tabs__hint">{hint}</span> : null}
        </div>
    );
}

/** 两行单元格：主值 + 一行小字（单号 / 时间 / 说明） */
export function Cell({
    main,
    sub,
    title,
    subDanger,
}: {
    main: ReactNode;
    sub?: ReactNode;
    title?: string;
    subDanger?: boolean;
}) {
    return (
        <span>
            <span className="biz-cell__main" {...(title ? { title } : {})}>
                {main}
            </span>
            {sub ? (
                <span className="biz-cell__sub" style={subDanger ? { color: '#9a6212' } : undefined}>
                    {sub}
                </span>
            ) : null}
        </span>
    );
}

/** 金额：统一两位小数 + 千分位 */
export function Money({ value, prefix = '¥ ' }: { value: number; prefix?: string }) {
    return (
        <span className="biz-num">
            {prefix}
            {value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </span>
    );
}
