/**
 * 商户后台示例的状态字典与展示规则。
 *
 * 为什么集中在这里：同一套状态被列表、卡片、详情、日志四处引用；
 * 分散写会出现「列表写提现失败、详情写渠道退回」这类同义不同词的毛病。
 */

import type { AcctTypeKey, ChannelDock } from '@/types/biz';

export type Tone = 'ok' | 'brand' | 'info' | 'violet' | 'warn' | 'danger' | 'neutral';

/** 语义色 → Semi Tag 颜色（Tag 的 color 是枚举字符串，不是 CSS 值）；`as const` 保证字面量类型 */
export const TONE_COLOR = {
    ok: 'green',
    brand: 'blue',
    info: 'light-blue',
    violet: 'violet',
    warn: 'orange',
    danger: 'red',
    neutral: 'grey',
} as const;

export interface DictItem {
    t: string;
    tone: Tone;
}

/* ---------- 状态字典 ---------- */

export const ORDER_ST: Record<string, DictItem> = {
    pending: { t: '待支付', tone: 'neutral' },
    paid: { t: '已支付', tone: 'brand' },
    trade_done: { t: '交易完成', tone: 'ok' },
    refunded: { t: '已退款', tone: 'neutral' },
    closed: { t: '已关闭', tone: 'neutral' },
};

export const PAY_ST: Record<string, DictItem> = {
    pending: { t: '待支付', tone: 'neutral' },
    paying: { t: '支付中', tone: 'info' },
    paid: { t: '已支付', tone: 'brand' },
    done: { t: '交易完成', tone: 'ok' },
    closed: { t: '已关闭', tone: 'neutral' },
    failed: { t: '支付失败', tone: 'danger' },
    unknown: { t: '支付结果未知', tone: 'warn' },
};

export const REFUND_ST: Record<string, DictItem> = {
    processing: { t: '退款中', tone: 'info' },
    unknown: { t: '结果未知', tone: 'warn' },
    success: { t: '退款成功', tone: 'ok' },
    failed: { t: '退款失败', tone: 'danger' },
};

export const REFUND_SRC: Record<string, DictItem> = {
    cs: { t: '客服处置', tone: 'neutral' },
    platform: { t: '平台发起', tone: 'info' },
    system: { t: '系统自动', tone: 'neutral' },
    dup: { t: '多付自动退', tone: 'violet' },
};

export const WD_ST: Record<string, DictItem> = {
    wait: { t: '待提现', tone: 'neutral' },
    review: { t: '待审核', tone: 'violet' },
    frozen: { t: '冻结中', tone: 'info' },
    transfer: { t: '打款中', tone: 'info' },
    arrived: { t: '已到账', tone: 'ok' },
    failed: { t: '提现失败', tone: 'danger' },
    abnormal: { t: '提现异常', tone: 'warn' },
    merged: { t: '已并入提现单', tone: 'info' },
    closed: { t: '已关闭', tone: 'neutral' },
};

export const VERIFY_ST: Record<string, DictItem> = {
    none: { t: '未实名', tone: 'neutral' },
    reviewing: { t: '审核中', tone: 'info' },
    ok: { t: '已实名', tone: 'ok' },
    failed: { t: '实名失败', tone: 'danger' },
};

export const EXPORT_ST: Record<string, DictItem> = {
    queued: { t: '排队中', tone: 'neutral' },
    running: { t: '生成中', tone: 'info' },
    done: { t: '已完成', tone: 'ok' },
    failed: { t: '失败', tone: 'danger' },
    expired: { t: '已过期', tone: 'neutral' },
};

export const FEE_MODES: Record<string, DictItem> = {
    free: { t: '免费', tone: 'ok' },
    single: { t: '单笔', tone: 'neutral' },
    rate: { t: '费率', tone: 'brand' },
    combo: { t: '组合', tone: 'violet' },
};

export const VOUCHER_ST: Record<string, DictItem> = {
    hit: { t: '已命中', tone: 'ok' },
    miss: { t: '未命中', tone: 'neutral' },
    expired: { t: '超窗口', tone: 'warn' },
    offline: { t: '线下打款', tone: 'info' },
};

/* ---------- 支付方式分组 ---------- */

/** 支付流水页签：分组由状态推出，不是存下来的字段 */
export const PAY_GROUPS: { k: string; t: string; states: string[] }[] = [
    { k: 'ok', t: '支付成功', states: ['paid', 'done'] },
    { k: 'wait', t: '待支付', states: ['pending', 'paying'] },
    { k: 'fail', t: '支付失败', states: ['failed'] },
    { k: 'closed', t: '已关闭', states: ['closed'] },
    { k: 'unknown', t: '结果未知', states: ['unknown'] },
];

export function payGroupOf(state: string): string {
    return PAY_GROUPS.find((g) => g.states.includes(state))?.k ?? 'unknown';
}

/* ---------- 账户类型字典（账户管理） ---------- */

/**
 * 九种账户类型。`online` 决定能不能选「线上」—— 只有微信 / 支付宝 / 银行卡可以；
 * `bank` 决定要不要填银行名称（只有银行卡要）。
 *
 * 不把类型做成一条记录里的多选，原因三条：不同类型的「结算账户」不是同一种东西
 * （商户号 / 账号 / 卡号）；「正常 / 冻结」必须能按条控制；出款 / 收款的下拉选的就是某一条具体账户。
 */
export const ACCT_TYPES: { k: AcctTypeKey; t: string; tone: Tone; online: boolean; bank: boolean }[] = [
    { k: 'wx', t: '微信', tone: 'ok', online: true, bank: false },
    { k: 'ali', t: '支付宝', tone: 'brand', online: true, bank: false },
    { k: 'bank', t: '银行卡', tone: 'neutral', online: true, bank: true },
    { k: 'tb', t: '淘宝', tone: 'info', online: false, bank: false },
    { k: 'dw', t: '得物', tone: 'violet', online: false, bank: false },
    { k: 'dy', t: '抖店', tone: 'neutral', online: false, bank: false },
    { k: 'xhs', t: '小红书', tone: 'danger', online: false, bank: false },
    { k: 'kjlm', t: '氪金联盟', tone: 'brand', online: false, bank: false },
    { k: 'jd', t: '京东', tone: 'danger', online: false, bank: false },
];

export function acctTypeOf(k: string) {
    return ACCT_TYPES.find((t) => t.k === k);
}
export function acctTypeName(k: string): string {
    return acctTypeOf(k)?.t ?? (k || '—');
}
/** 这个类型能不能选线上：微信 / 支付宝 / 银行卡可以，其余固定线下 */
export function acctCanOnline(k: string): boolean {
    return Boolean(acctTypeOf(k)?.online);
}

/** 账号脱敏：只露前 2 位与后 4 位，中间一律星号 */
export function acctMask(v: string | undefined | null): string {
    const s = String(v ?? '').trim();
    if (!s) return '—';
    if (s.length <= 6) return s.slice(0, 2) + '*'.repeat(Math.max(1, s.length - 2));
    return s.slice(0, 2) + '*'.repeat(Math.min(10, s.length - 6)) + s.slice(-4);
}

/**
 * 账户能不能用：正常 **且** 未冻结。全站只此一处判断。
 * 只判一个会把「正常但被冻结」放过去 —— 两个开关是独立的，正常但冻结、异常但没冻结都是真实状态。
 */
export function acctOk(a: { normal: boolean; frozen: boolean } | null | undefined): boolean {
    return Boolean(a && a.normal && !a.frozen);
}

/** 不可用的原因：冻结优先于异常（冻结是渠道侧动作，先说这个） */
export function acctBadText(a: { normal: boolean; frozen: boolean } | null | undefined): string {
    if (!a) return '账户不存在';
    if (a.frozen) return '已冻结';
    if (!a.normal) return '账户异常';
    return '';
}

/** 账户一句话摘要：主体 · 类型 · 银行 · 账号脱敏 */
export function acctLine(
    a: { subject: string; type: string; bank?: string; acct: string } | null | undefined,
): string {
    if (!a) return '—';
    const parts = [a.subject, acctTypeName(a.type)];
    if (a.bank) parts.push(a.bank);
    parts.push(acctMask(a.acct));
    return parts.join(' · ');
}

/**
 * 对接类型由「账户类型 + 方式 + 三方名称」推出，不再由人选。
 * 线下固定 offline；线上按类型分：微信 / 支付宝直连，银行卡走三方或直连。
 */
export function dockOfAccount(type: string, online: boolean, third?: string): ChannelDock {
    if (!online) return 'offline';
    if (type === 'wx') return 'wx';
    if (type === 'ali') return 'ali';
    if (type === 'bank') return third ? 'third' : 'bank';
    return 'third';
}

/* ---------- 收款渠道字典 ---------- */

/** 对接类型五档：线下 / 三方 / 微信直连 / 支付宝直连 / 银行卡 */
export const DOCKS: { k: ChannelDock; t: string; tone: Tone; d: string }[] = [
    { k: 'offline', t: '线下', tone: 'neutral', d: '买家用网银 / 手机银行转给商户，财务按流水人工核销' },
    { k: 'third', t: '三方', tone: 'violet', d: '通过收单机构进件，可收微信或支付宝' },
    { k: 'wx', t: '微信直连', tone: 'ok', d: '与微信支付直签，只收微信' },
    { k: 'ali', t: '支付宝直连', tone: 'brand', d: '与支付宝直签，只收支付宝' },
    { k: 'bank', t: '银行卡', tone: 'neutral', d: '银行卡直连收单' },
];

export const THIRDS = ['汇付天下', '易宝支付', '连连支付'];
export const CYCLES: { k: string; d: string }[] = [
    { k: 'T1', d: '交易日次工作日到账' },
    { k: 'D1', d: '自然日次日到账' },
    { k: 'D0', d: '当日到账' },
    { k: 'S0', d: '实时到账（秒到）' },
];

/** 收款方式：一条渠道只挂一种，按支付方式分成三组 */
export const WAYS: { k: string; g: 'wx' | 'ali' | 'solo'; t: string; scene: string }[] = [
    { k: 'wx_jsapi', g: 'wx', t: '公众号 / 微信网页', scene: '公众号、微信内 H5、分享页' },
    { k: 'wx_mini', g: 'wx', t: '小程序', scene: '微信小程序内下单收款' },
    { k: 'wx_native', g: 'wx', t: '主扫', scene: 'Native 支付，用户主动扫码' },
    { k: 'wx_app', g: 'wx', t: 'APP 支付', scene: 'App 内调微信 OpenSDK' },
    { k: 'wx_h5', g: 'wx', t: 'H5 支付', scene: '微信外的手机浏览器' },
    { k: 'ali_app', g: 'ali', t: 'APP 支付', scene: '原生 App 内调起支付宝' },
    { k: 'ali_face', g: 'ali', t: '当面付', scene: '线下场景，面对面扫码' },
    { k: 'ali_jsapi', g: 'ali', t: 'JSAPI 支付', scene: '支付宝小程序内调起收银台' },
    { k: 'ali_h5', g: 'ali', t: 'H5 支付', scene: '手机浏览器唤起支付宝' },
    { k: 'ali_inst', g: 'ali', t: '花呗分期', scene: '按 3 / 6 / 12 期收单，各期费率单独配' },
    { k: 'bank', g: 'solo', t: '银行卡转账', scene: '买家转账，财务人工核销' },
    { k: 'unionpay', g: 'solo', t: '云闪付', scene: '银联云闪付' },
    { k: 'jd', g: 'solo', t: '京东收银台', scene: '京东收银台' },
    { k: 'douyin', g: 'solo', t: '抖音收银台', scene: '抖音收银台' },
];

/** 引流池：微信与支付宝两个大池；专有渠道各自成池 */
export const POOL_NAMES: Record<string, string> = { wx: '微信', ali: '支付宝' };

export function dockOf(k: string) {
    return DOCKS.find((d) => d.k === k);
}
export function wayOf(k: string) {
    return WAYS.find((w) => w.k === k);
}
export function wayName(k: string) {
    return wayOf(k)?.t ?? '—';
}
/** 某个对接类型能选哪些收款方式 */
export function waysFor(dock: string) {
    if (dock === 'third') return WAYS.filter((w) => w.g === 'wx' || w.g === 'ali');
    if (dock === 'wx') return WAYS.filter((w) => w.g === 'wx');
    if (dock === 'ali') return WAYS.filter((w) => w.g === 'ali');
    return WAYS.filter((w) => w.k === dock);
}
/** 这条渠道在哪个池子里（微信 / 支付宝 / 自身） */
export function poolOfWay(k: string): string {
    const w = wayOf(k);
    if (!w) return '';
    return w.g === 'solo' ? k : w.g;
}

/* ---------- 导出任务字典 ---------- */

export const EXPORT_KINDS: Record<string, string> = {
    orders: '订单管理',
    payFlows: '支付流水',
    refunds: '退款管理',
    wdOrder: '订单提现',
    wdPend: '合并提现单',
    unwithdrawn: '未提现订单',
};

export const EXPORT_MAX = 50000;
export const EXPORT_KEEP_DAYS = 7;

/* ---------- 金额与时间 ---------- */

/** 两位小数 + 千分位：列表金额统一走它 */
export function money(n: number | undefined | null): string {
    return (Number(n) || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/** 整数 + 千分位：KPI 大数用它，避免小数把卡片撑破 */
export function money0(n: number | undefined | null): string {
    return (Number(n) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

/** 'YYYY-MM-DD HH:mm' → 'MM-DD HH:mm'；空值返回 '' （调用方决定写不写「—」） */
export function fmtTime(v: string | undefined | null): string {
    return String(v ?? '').slice(5, 16);
}

/** 交易手续费：按订单金额的百分比，从卖家货款里扣 */
export function platFeeOf(amt: number, feePct: number): number {
    return +(((Number(amt) || 0) * (Number(feePct) || 0)) / 100).toFixed(2);
}

/** 一项费率型费用的配置形状（交易手续费 / 包赔费共用） */
export interface FeeRuleLike {
    feePct?: number | undefined;
    feeMin?: number | undefined;
    feeMax?: number | undefined;
}

/**
 * 费率型费用的金额：**先按费率算，再夹下限，再夹上限**（顺序固定）。
 *
 * 顺序不能颠倒 —— 反过来会把「最低 ¥10」变成「10% 的 ¥10」。
 * 上下限填 0 表示不限：只兜底、不改中间那一段。
 *
 * 交易规则页的试算、商品编辑弹窗里的包赔费、订单详情的资金明细都调这一个函数，
 * 否则同一笔钱在三个页面会算出三个数。
 */
export function feeOf(amt: number, rule: FeeRuleLike | null | undefined): number {
    const base = ((Number(amt) || 0) * (Number(rule?.feePct) || 0)) / 100;
    let fee = base;
    const min = Number(rule?.feeMin) || 0;
    const max = Number(rule?.feeMax) || 0;
    if (min > 0 && fee < min) fee = min;
    if (max > 0 && fee > max) fee = max;
    return +fee.toFixed(2);
}

/** 应提货款 = 订单金额 − 交易手续费 */
export function netOf(amt: number, feePct: number): number {
    return +(Number(amt) || 0).toFixed(2) - platFeeOf(amt, feePct);
}

/** 自然日差：from（YYYY-MM-DD 起）到今天；无效返回 null */
export function daysSince(v: string | undefined | null): number | null {
    const raw = String(v ?? '').slice(0, 10);
    if (!raw) return null;
    const then = new Date(`${raw}T00:00:00`).getTime();
    if (Number.isNaN(then)) return null;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return Math.max(0, Math.round((today.getTime() - then) / 86400000));
}

/** 手续费试算：费率 + 固定费，夹在最低 / 最高之间 */
export function wdFeeCalc(
    amt: number,
    o: { feeOn: boolean; feeRate: number; feeFixed?: number; feeMin: number; feeMax: number },
): number {
    if (!o.feeOn) return 0;
    const raw = ((Number(amt) || 0) * (Number(o.feeRate) || 0)) / 100 + (Number(o.feeFixed) || 0);
    let fee = +raw.toFixed(2);
    if (o.feeMin > 0 && fee < o.feeMin) fee = o.feeMin;
    if (o.feeMax > 0 && fee > o.feeMax) fee = o.feeMax;
    return +fee.toFixed(2);
}

/** 手续费文案：单笔 / 费率 / 组合 / 免费 四种模式各一种说法 */
export function feeText(a: {
    mode: string;
    single: number;
    rate: number;
    minFee: number;
    maxFee: number;
}): string {
    const single = money(a.single);
    const rate = `${a.rate}%`;
    if (a.mode === 'free') return '免费';
    if (a.mode === 'single') return `¥${single}/笔`;
    if (a.mode === 'rate') return rate;
    return `¥${single}/笔 + ${rate}`;
}

/**
 * 支付单上的通道编号 → 通道别名。
 *
 * 支付单记的是「这笔落在哪条收款通道」（MA001…），列表要显示别名 —— 同一个
 * 汇付可以开好几条扫码通道，只写渠道名分不出走的是哪一条。
 * 字典随种子数据的通道编号一起维护；查不到时页面显示原编号，不吞数据。
 */
export const PAY_CHANNEL_ALIAS: Record<string, string> = {
    MA001: '汇付扫码01',
    MA002: '汇付小程序01',
    MA003: '易宝公众号01',
    MA004: '汇付APP01',
    MA005: '易宝扫码01',
    MA006: '汇付聚合01',
    MA007: '易宝聚合01',
    MA008: '汇付扫码02',
};
