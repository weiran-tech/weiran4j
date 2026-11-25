import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import type { PageResult } from '@/types/api';
import { http } from '@/utils/request';

/** 示例商贸运营后台：商品 / 订单 / 用户 / 返利 / 返利配置的 Mock 查询与变更。 */

export interface OpsLog {
    time: string;
    action: string;
    operator: string;
    remark: string;
}

export interface OpsGoodsRow {
    id: number;
    code: string;
    unionId: string;
    title: string;
    userId: string;
    game: string;
    channel: string;
    region: string;
    server: string;
    account: string;
    status: string;
    source: string;
    price: number;
    createdAt: string;
    onAt: string;
    offAt: string;
    deletedAt: string;
    soldAt: string;
    buyerUid: string;
    /** 支付时选的收款商户（引用 bizChannel 的 code）；空 = 还没支付 */
    payChannel?: string;
    /**
     * 免收包赔费：这个商品单独不收包赔费（买家实付 = 售价）。
     * 不勾就按「交易规则 → 包赔费」的全局费率算 —— 费率变了这里不跟着改，勾选是例外口径。
     */
    guarFree?: boolean;
    logs: OpsLog[];
}

/** 线下单的打款登记：线下单不走渠道代付，由运营用自己的账户打款并留凭证 */
export interface OpsOfflinePay {
    state: 'todo' | 'done';
    at: string;
    no: string;
    by: string;
    proof: string;
}

export interface OpsOrderRow {
    id: number;
    code: string;
    goodsCode: string;
    buyerUid: string;
    sellerUid: string;
    game: string;
    channel: string;
    region: string;
    server: string;
    account: string;
    title: string;
    price: number;
    /** 返利类目：账号 / 道具 */
    category: RebateCategory;
    /** 订单利润（元），低于返利配置的利润门槛不返利 */
    profit: number;
    status: string;
    paidAt: string;
    doneAt: string;
    canceledAt: string;
    afterSaleAt: string;
    /** 订单来源：渠道单走支付单，线下单走打款登记 */
    orderType: '渠道单' | '线下单';
    /** 仅线下单有：打款登记状态；渠道单为 null */
    offlinePay: OpsOfflinePay | null;
    /**
     * 收款渠道（引用 bizChannel 的 code）：这笔钱从哪条路进来。
     * 渠道单在买家支付时定，线下单在转线下 / 创建时定 —— 两边的钱都不走同一个收银台。
     */
    recvChannel?: string;
    /** 出款账户（引用 bizPayoutAccount 的 code）：这笔钱最后从哪个账户打给卖家 */
    payoutAcct?: string;
    /** 线下单实收金额：实际到账多少，可能与订单金额不同（差额另走改价） */
    receivedAmt?: number;
    /** 线下收款的付款凭证：买家转账截图 / 回执 —— 系统拿不到渠道回执，这就是唯一凭据 */
    recvProof?: string;
    /**
     * 包赔费快照：下单那一刻商品是否「免收包赔费」。
     * 商品后来改了勾选也不回写历史单 —— 与费率快照同一个口径。
     */
    guarFree?: boolean;
    logs: OpsLog[];
}

export interface OpsInvitee {
    uid: string;
    nickname: string;
    reg: string;
    gmv: number;
}

export interface OpsSettlement {
    verify: 'none' | 'reviewing' | 'ok' | 'failed';
    verifyAt: string;
    bank: {
        name: string;
        no: string;
        provider: string;
        uid3: string;
        joined: boolean;
        boundAt: string;
        state: 'active' | 'rejected';
        sync?: 'pending';
    } | null;
    alipay: { name: string; account: string; filledAt: string } | null;
}

export interface OpsUserRow {
    id: number;
    uid: string;
    displayId: string;
    nickname: string;
    phone: string;
    realName: string;
    idcard: string;
    role: string;
    /** 返利等级编码（A/B/C…），空串表示未设置等级 */
    level: string;
    orders: number;
    status: string;
    reg: string;
    real: string;
    inviteCode: string;
    invitedBy: string;
    inviteUsers: OpsInvitee[];
    /** 结算信息：钱收到哪 —— 实名通过后才有 */
    settlement: OpsSettlement | null;
    logs: OpsLog[];
}

export interface OpsRebateRow {
    id: number;
    code: string;
    orderCode: string;
    buyerUid: string;
    inviterUid: string;
    price: number;
    category: RebateCategory;
    level: string;
    origin: string;
    mode: RebateMode;
    rate: number;
    amount: number;
    profit: number;
    status: string;
    relation: string;
    codeAt: string;
    createdAt: string;
    paidAt: string;
    /** 补发名称（仅补发单） */
    supplementName: string;
    /** 内部后台备注（用户不可见） */
    internalRemark: string;
    logs: OpsLog[];
}

/** 返利方式：按订单金额比例 / 每单固定金额 */
export type RebateMode = 'rate' | 'fixed';

/** 返利类目 */
export type RebateCategory = '账号' | '道具';

/** 单个类目的返利规则 */
export interface OpsCategoryRule {
    category: RebateCategory;
    enabled: boolean;
    mode: RebateMode;
    rate: number;
    amount: number;
}

/** 返利等级：等级可按类目设置不同的比例 / 固定金额 */
export interface OpsLevel {
    id: number;
    code: string;
    name: string;
    rules: OpsCategoryRule[];
}

/** 专属用户返利：按类目覆盖等级规则 */
export interface OpsRateRow {
    id: number;
    uid: string;
    rules: OpsCategoryRule[];
}

export interface OpsConfig {
    id: number;
    /** 确认收货后多少小时生成返利单 */
    settleHours: number;
    /** 订单利润低于该金额不返利 */
    profitThreshold: number;
    audit: boolean;
    levels: OpsLevel[];
}

/** 列表响应：分页数据 + 各状态数量（页签角标） */
export type OpsPage<T> = PageResult<T> & { counts: Record<string, number> };

export type OpsResource = 'goods' | 'order' | 'user' | 'rebate' | 'rate' | 'config';

export function useOpsList<T>(resource: OpsResource, query: Record<string, unknown>) {
    return useQuery({
        queryKey: ['ops', resource, 'list', query],
        queryFn: () => http.get<OpsPage<T>>(`/api-backend/ops/${resource}/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useOpsListAll<T>(resource: OpsResource, query: Record<string, unknown> = {}) {
    return useQuery({
        queryKey: ['ops', resource, 'all', query],
        queryFn: async () => {
            const result = await http.get<OpsPage<T>>(
                `/api-backend/ops/${resource}/list${toQueryString({ ...query, page: 1, pageSize: 500 })}`,
            );
            return result.list;
        },
        staleTime: 30_000,
    });
}

export function useOpsConfig() {
    return useQuery({
        queryKey: ['ops', 'config'],
        queryFn: () => http.get<OpsConfig>('/api-backend/ops/config/list'),
    });
}

/** 运营后台的写操作：带 id 走 PUT，不带 id 走 POST；删除专属用户时传 DELETE */
export function useOpsAction(resource: OpsResource) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ action, id, body, method = id === undefined ? 'POST' : 'PUT' }: {
            action: string;
            id?: number;
            body?: Record<string, unknown>;
            method?: 'POST' | 'PUT' | 'DELETE';
        }) => {
            const url = `/api-backend/ops/${resource}/${action}${id === undefined ? '' : `/${id}`}`;
            if (method === 'DELETE') return http.delete<unknown>(url);
            if (method === 'PUT') return http.put<unknown>(url, body ?? {});
            return http.post<unknown>(url, body ?? {});
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: ['ops', resource] }),
    });
}
