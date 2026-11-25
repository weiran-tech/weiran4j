import { SideSheet, Table, Tabs, Tag } from '@douyinfe/semi-ui';
import type { ColumnProps } from '@douyinfe/semi-ui/lib/es/table';
import type { ReactNode } from 'react';
import type { OpsCategoryRule, OpsInvitee, OpsLevel, OpsLog, OpsUserRow, RebateCategory, RebateMode } from '@/hooks/queries/ops';
import './ops.css';

/** 金额：¥1,234.00 */
export function money(value: number) {
    return `¥${Number(value).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/** 累计消费：¥1,234（不带小数） */
export function gmvText(value: number) {
    return `¥${Number(value).toLocaleString('zh-CN')}`;
}

/** 返利系统计算值：按比例取订单金额 × 比例，固定金额直接取配置金额 */
export function rebateBase(row: { mode?: RebateMode; price: number; rate: number; amount?: number }) {
    if (row.mode === 'fixed') return Math.round(Number(row.amount ?? 0) * 100) / 100;
    return Math.round(((row.price * row.rate) / 100) * 100) / 100;
}

/** 返利比例上限（%） */
export const RATE_MAX = 10;

/** 返利类目 */
export const REBATE_CATEGORIES: RebateCategory[] = ['账号', '道具'];

/** 取某个类目的规则，缺失时返回「不返」 */
export function categoryRule(rules: OpsCategoryRule[] | undefined, category: RebateCategory): OpsCategoryRule {
    return rules?.find((rule) => rule.category === category) ?? { category, enabled: false, mode: 'rate', rate: 0, amount: 0 };
}

/** 等级展示：A · 一级代理；空等级显示「无等级」 */
export function levelText(levels: OpsLevel[] | undefined, code: string) {
    if (!code) return '无等级';
    const level = levels?.find((item) => item.code === code);
    return level ? `${level.code} · ${level.name}` : code;
}

/** 返利方式名称 */
export function rebateModeName(mode: RebateMode) {
    return mode === 'fixed' ? '固定金额' : '按比例';
}

/** 返利方式取值：5% / ¥20.00/单 */
export function rebateRuleText(mode: RebateMode, rate: number, amount: number) {
    return mode === 'fixed' ? `${money(amount)}/单` : `${rate}%`;
}

/** 返利计算口径：订单金额 × 5% / 每单固定 ¥20.00 */
export function rebateCalcText(mode: RebateMode, rate: number, amount: number) {
    return mode === 'fixed' ? `每单固定 ${money(amount)}` : `订单金额 × ${rate}%`;
}

/** 邀请人数：下线记录条数 */
export function inviteCount(row: { inviteUsers?: OpsInvitee[] }) {
    return row.inviteUsers?.length ?? 0;
}

/** 下线累计消费 */
export function inviteGmv(row: { inviteUsers?: OpsInvitee[] }) {
    return (row.inviteUsers ?? []).reduce((sum, item) => sum + (item.gmv ?? 0), 0);
}

const STATUS_COLORS: Record<string, 'green' | 'grey' | 'blue' | 'orange' | 'red'> = {
    已上架: 'green',
    已下架: 'grey',
    已售出: 'blue',
    已删除: 'red',
    待支付: 'orange',
    已支付: 'blue',
    已发货: 'blue',
    已收货: 'orange',
    已完成: 'green',
    已关闭: 'grey',
    已取消: 'grey',
    已退款: 'red',
    正常: 'green',
    冻结: 'orange',
    封禁: 'red',
    已实名: 'green',
    未实名: 'red',
    待审核: 'orange',
    已返利: 'green',
    已结算: 'green',
    已分账: 'green',
};

/** 运营后台的状态标签：按业务状态映射颜色 */
export function OpsStatusTag({ value }: { value: string }) {
    return (
        <Tag size="small" color={STATUS_COLORS[value] ?? 'grey'}>
            {value || '—'}
        </Tag>
    );
}

/** 优惠来源 / 邀请关系这类双值标签：命中主态用蓝色，否则灰色 */
export function OpsPlainTag({ value, brand = false }: { value: string; brand?: boolean }) {
    return (
        <Tag size="small" color={brand ? 'blue' : 'grey'}>
            {value}
        </Tag>
    );
}

/** 页面标题 + 描述，配合 PageContainer 的 title 使用 */
export function OpsTitle({ name, desc }: { name: string; desc: string }) {
    return (
        <span>
            {name}
            <span className="ops-page-desc">{desc}</span>
        </span>
    );
}

export function OpsNote({ children }: { children: ReactNode }) {
    return <div className="ops-note">{children}</div>;
}

/** 页面标题右侧的口径提示 */
export function OpsPageTip({ children }: { children: ReactNode }) {
    return <span className="ops-page-tip">{children}</span>;
}

/** 状态页签（带数量角标）；value 为空串表示「全部」 */
export function OpsTabs({
    options,
    value,
    counts,
    onChange,
}: {
    options: readonly string[];
    value: string;
    counts: Record<string, number>;
    onChange: (value: string) => void;
}) {
    const total = Object.values(counts).reduce((sum, count) => sum + count, 0);
    return (
        <Tabs
            className="ops-tabs"
            type="line"
            activeKey={value || '全部'}
            onChange={(key) => onChange(String(key) === '全部' ? '' : String(key))}
        >
            {options.map((option) => (
                <Tabs.TabPane
                    key={option}
                    itemKey={option}
                    tab={
                        <span>
                            {option}
                            <span className="ops-tab-count">{option === '全部' ? total : (counts[option] ?? 0)}</span>
                        </span>
                    }
                />
            ))}
        </Tabs>
    );
}

/** 用户单元格：昵称 + 用户ID */
export function OpsUserCell({ uid, users }: { uid: string; users?: OpsUserRow[] }) {
    if (!uid) return <span className="ops-sub">—</span>;
    const user = users?.find((item) => item.uid === uid);
    return user ? (
        <div className="ops-cell2">
            <span>{user.nickname}</span>
            <span className="ops-cell2__sub ops-mono">{uid}</span>
        </div>
    ) : (
        <span className="ops-mono">{uid}</span>
    );
}

export function OpsSection({ title }: { title: string }) {
    return <div className="ops-section-title">{title}</div>;
}

/** 详情抽屉里的键值区 */
export function OpsKv({ items }: { items: [string, ReactNode][] }) {
    return (
        <div className="ops-kv">
            {items.map(([key, value]) => (
                <div key={key} style={{ display: 'contents' }}>
                    <div className="ops-kv__k">{key}</div>
                    <div className="ops-kv__v">{value === '' || value === null || value === undefined ? '—' : value}</div>
                </div>
            ))}
        </div>
    );
}

/** 详情抽屉外壳：统一宽度与底部操作区 */
export function OpsDetailSheet({
    visible,
    title,
    footer,
    onClose,
    children,
}: {
    visible: boolean;
    title: string;
    footer?: ReactNode;
    onClose: () => void;
    children: ReactNode;
}) {
    return (
        <SideSheet
            visible={visible}
            title={title}
            width={640}
            onCancel={onClose}
            {...(footer ? { footer: <div className="ops-sheet-footer">{footer}</div> } : {})}
        >
            {children}
        </SideSheet>
    );
}

/** 操作记录抽屉：按时间倒序展示 */
export function OpsLogsSheet({
    visible,
    title,
    logs,
    onClose,
}: {
    visible: boolean;
    title: string;
    logs: OpsLog[];
    onClose: () => void;
}) {
    const columns: ColumnProps<OpsLog>[] = [
        { title: '时间', dataIndex: 'time', width: 150 },
        { title: '操作', dataIndex: 'action', width: 120 },
        { title: '操作人', dataIndex: 'operator', width: 120 },
        { title: '备注', dataIndex: 'remark' },
    ];
    const rows = [...logs].sort((a, b) => b.time.localeCompare(a.time));
    return (
        <OpsDetailSheet visible={visible} title={title} onClose={onClose}>
            <OpsNote>共 <b>{rows.length}</b> 条，按时间倒序。</OpsNote>
            <Table<OpsLog>
                rowKey={(row) => `${row?.time}-${row?.action}`}
                columns={columns}
                dataSource={rows}
                pagination={false}
                size="small"
            />
        </OpsDetailSheet>
    );
}
