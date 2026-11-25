/**
 * 商户后台示例业务类型（收付管理 / 财务管理 / 用户结算）。
 *
 * 与 `api.ts`（系统管理域）分开：这一组字段来自业务演示原型的数据模型，
 * 命名规则是「单号用 code，主键用数字 id」——Mock 传输层只认数字 id，
 * 业务单号（OD / PAY / RF / WD / PW / EXP）作为普通字段存。
 */

/* ---------- 通用 ---------- */

/** 实名状态：决定能不能有结算信息、能不能提现 */
export type VerifyState = 'none' | 'reviewing' | 'ok' | 'failed';

/** 操作日志：结算信息、提现单、退款单共用同一形状 */
export interface BizLog {
    at: string;
    who: string;
    act: string;
    ok?: boolean;
    note?: string;
}

/* ---------- 用户结算信息 ---------- */

export interface BizBank {
    name: string;
    no: string;
    provider: string;
    uid3: string;
    joined: boolean;
    boundAt: string;
    /** active = 平台侧已生效；rejected = 提交被拦未写入 */
    state: 'active' | 'rejected';
    /** pending = 换过卡，渠道侧卡号待下一次提现时同步 */
    sync?: 'pending';
}

export interface BizAlipay {
    name: string;
    account: string;
    filledAt: string;
}

/* ---------- 订单 ---------- */

/** 商品单状态：只管「买家确认交易完成」这一个分水岭 */
export type OrderState = 'pending' | 'paid' | 'trade_done' | 'refunded' | 'closed';
/** 订单来源：渠道单走支付单，线下单走打款登记 */
export type OrderChannel = 'channel' | 'offline';

export interface OrderOfflinePay {
    state: 'todo' | 'done';
    at: string;
    no: string;
    by: string;
    proof: string;
}

export interface OrderCancel {
    at: string;
    by: string;
    reasonKey: string;
    reason: string;
    fault: 'buyer' | 'seller' | 'system';
    refundAmt: number;
    remark: string;
    proof: string;
    refundCode: string;
    mode: 'channel' | 'offline';
}

export interface BizOrderView {
    id: number;
    code: string;
    sellerId: string;
    ch: OrderChannel;
    seller: string;
    buyer: string;
    item: string;
    goodsId?: string;
    amt: number;
    payCode: string;
    state: OrderState;
    payAt: string;
    confirmedAt: string;
    createdAt: string;
    /** 申请售后时间：没有就不显示（不是 0，是「没发生」） */
    afterSaleAt?: string;
    offlinePay?: OrderOfflinePay;
    cancel?: OrderCancel;
    delisted?: boolean;
}

/* ---------- 支付流水 ---------- */

/** 支付单状态：一行 = 一次支付尝试 */
export type PayState = 'pending' | 'paying' | 'paid' | 'done' | 'closed' | 'failed' | 'unknown';

export interface BizPaymentView {
    id: number;
    code: string;
    /** 支付订单编号（网关生成） */
    pno: string;
    uid: string;
    /** 落在哪条收款通道（渠道别名或通道编号）；空 = 未落通道 */
    channel: string;
    orderCode: string;
    amt: number;
    state: PayState;
    /** 支付来源：微信 / 支付宝 / 空 */
    payway: string;
    scene: string;
    refunded: number;
    inflight: number;
    createdAt: string;
    tradeNo: string;
    closedAt?: string;
    closeReason?: string;
}

/* ---------- 退款 ---------- */

export type RefundState = 'processing' | 'unknown' | 'success' | 'failed';
export type RefundSource = 'cs' | 'platform' | 'system' | 'dup';

export interface RefundOffline {
    amt: number;
    proof: string;
    at: string;
    by: string;
    remark: string;
}

export interface BizRefundView {
    id: number;
    code: string;
    batch: string;
    payCode: string;
    orderCode: string;
    orderType: string;
    uid: string;
    amt: number;
    state: RefundState;
    src: RefundSource;
    reason: string;
    operator: string;
    createdAt: string;
    refundAt: string;
    failWhy: string;
    remark: string;
    offline?: RefundOffline;
}

/* ---------- 提现 ---------- */

/** 订单提现单状态：一单锚一笔货款 */
export type WdState =
    | 'wait'
    | 'review'
    | 'frozen'
    | 'transfer'
    | 'arrived'
    | 'failed'
    | 'abnormal'
    | 'merged'
    | 'closed';

export interface BizWithdrawalView {
    id: number;
    code: string;
    orderCode: string;
    seller: string;
    /** 应提货款（订单金额 − 交易手续费） */
    amt: number;
    commission: number;
    state: WdState;
    mergedInto?: string;
    mergeAt?: string;
    path: string;
    account: string;
    applyAt: string;
    payAt: string;
    doneAt: string;
    payMode?: 'channel' | 'offline';
    tradeNo?: string;
    proof?: string;
    logs: BizLog[];
}

/** 合并提现单明细：一次「全部提现」里装着哪几笔钱 */
export interface PendWdItem {
    kind: 'order' | 'promo';
    ref: string;
    amt: number;
}

export interface BizPendWdView {
    id: number;
    code: string;
    uid: string;
    seller: string;
    amt: number;
    fee: number;
    net: number;
    state: Exclude<WdState, 'wait' | 'merged' | 'closed'>;
    path: string;
    account: string;
    failCode?: string;
    retries: number;
    items: PendWdItem[];
    applyAt: string;
    frozenAt?: string;
    freezeFrom?: string;
    doneAt: string;
    reviewBy?: string;
    reviewAt?: string;
    logs: BizLog[];
}

/* ---------- 账户管理（全站唯一账户台账） ---------- */

/**
 * 账户类型：九种。只有微信 / 支付宝 / 银行卡能选「线上」，其余固定走线下。
 * 一条记录 = 一个公司主体 × 一个类型 × 一个结算账户。
 */
export type AcctTypeKey = 'wx' | 'ali' | 'bank' | 'tb' | 'dw' | 'dy' | 'xhs' | 'kjlm' | 'jd';

export interface BizAccountView {
    id: number;
    /** 账户编号 AC001… */
    code: string;
    /** 公司主体：写营业执照全称 */
    subject: string;
    type: AcctTypeKey;
    /** 银行名称（写到支行），仅银行卡必填 */
    bank: string;
    /** 结算账户：银行卡号 / 支付宝账号 / 微信商户号 / 店铺账号 */
    acct: string;
    /** 是否正常：资质复核中 / 资料不全时置为 false（状态名「异常」） */
    normal: boolean;
    /** 是否冻结：渠道风控冻结。与「异常」是两件事，可同时成立 */
    frozen: boolean;
    note: string;
    /** 登记日 */
    at: string;
}

/* ---------- 出款账户 ---------- */

/**
 * 到账方式：由引用账户的类型推出，不再是人选的下拉。
 * 存两份会在换账户时对不上，所以只在保存时从账户带出。
 */
export type PayoutWay = 'bank' | 'ali' | 'wx' | AcctTypeKey;
/** 手续费模式：免费 / 单笔 / 费率 / 组合 */
export type FeeMode = 'free' | 'single' | 'rate' | 'combo';

export interface PayoutAlipayCred {
    priv: string;
    pub: string;
    certApp: string;
    certAli: string;
    certRoot: string;
}

/** 微信商家转账六项凭证：按「商户号」签约，比支付宝多商户号与 AppID */
export interface PayoutWxCred {
    mchid: string;
    priv: string;
    serial: string;
    pub: string;
    apiV3: string;
    appId: string;
}

export interface BizPayoutAccountView {
    id: number;
    code: string;
    /** 别名：列表、C 端出款记录、审计日志都用它；留空按「主体 + 类型 + 三方」生成 */
    alias: string;
    /** 引用「账户管理」的那一条（AC001…）：主体 / 结算账户 / 渠道都从它带出 */
    acct: string;
    /** 方式：只有微信 / 支付宝 / 银行卡可改；其余类型固定线下 */
    online: boolean;
    /** 以下四项由引用账户在保存时带出，不再手填；保留是为了历史单据与列表展示 */
    provider: string;
    way: PayoutWay;
    subject: string;
    acctLabel: string;
    /** 三方渠道：仅银行卡且线上时出现 */
    third: string;
    mode: FeeMode;
    single: number;
    rate: number;
    minFee: number;
    maxFee: number;
    note: string;
    /** 提现出款是否启用：每种到账方式只允许启用一条 */
    wd: boolean;
    at: string;
    off?: boolean;
    offAt?: string;
    alipay?: PayoutAlipayCred;
    wx?: PayoutWxCred;
}

/* ---------- 收款商户：渠道（主体已并入账户管理） ---------- */

export interface BizEntityView {
    id: number;
    code: string;
    name: string;
    usc: string;
    bank: string;
    acct: string;
    state: 'active' | 'off';
    at: string;
    note: string;
}

/** 对接类型：线下 / 三方 / 微信直连 / 支付宝直连 / 银行卡 */
export type ChannelDock = 'offline' | 'third' | 'wx' | 'ali' | 'bank';

export interface BizChannelView {
    id: number;
    code: string;
    /** 别名 3–8 字、全局唯一、保存后不可修改 */
    alias: string;
    /** 引用「账户管理」的那一条 */
    acct: string;
    /** 方式：线上 / 线下；支付宝 / 银行卡 / 微信 之外的类型固定线下 */
    online: boolean;
    /** 以下由账户与方式推出，不再由人选 */
    dock: ChannelDock;
    third?: string;
    /** 兼容字段：旧主体编号，新数据留空，展示以账户为准 */
    entity?: string;
    ways: string[];
    inst?: number[];
    instRates?: Record<string, number>;
    rate: number;
    cycle: string;
    singleLimit: number;
    dayLimit: number;
    weight: number;
    openFrom: string;
    openTo: string;
    on: boolean;
    at: string;
    cred?: { id: string; key: string };
    note: string;
}

/* ---------- 交易规则 ---------- */

/** 一项费率型费用：费率 × 金额，再夹在最低 / 最高之间（0 = 不限） */
export interface TradeFeeRule {
    feePct: number;
    feeMin: number;
    feeMax: number;
}

export interface BizTradeRuleView {
    id: number;
    /** 交易手续费：平台抽成，从卖家货款扣 */
    trade: TradeFeeRule;
    /** 包赔手续费：向买家收（加进买家实付），归平台、平台承担赔付；不进卖家货款 */
    guar: TradeFeeRule;
}

/* ---------- 提现规则（只作用于返利提现） ---------- */

export interface PayRuleWay {
    on: boolean;
    feeOn: boolean;
    feeRate: number;
    feeFixed?: number;
    feeMin: number;
    feeMax: number;
    min: number;
    max: number;
    note: string;
}

export interface BizPayRuleView {
    id: number;
    general: { dayCap: number; reviewCap: number; freezeMin: number; auto: boolean };
    ali: PayRuleWay;
    bank: PayRuleWay;
}

/* ---------- 导出任务 ---------- */

export type ExportState = 'queued' | 'running' | 'done' | 'failed' | 'expired';

export interface BizExportJobView {
    id: number;
    code: string;
    kind: string;
    menu: string;
    filter: string;
    rows: number;
    state: ExportState;
    progress: number;
    at: string;
    doneAt: string;
    file: string;
    size: string;
    expireAt: string;
    downloads: number;
    by: string;
    err: string;
}
