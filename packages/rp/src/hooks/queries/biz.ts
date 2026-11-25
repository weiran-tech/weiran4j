import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { http } from '@/utils/request';

/**
 * 商户后台示例的数据访问。
 *
 * 统一走 Mock 传输层的通用 CRUD：`/api-backend/{table}/listAll|create|update/{id}|delete/{id}`。
 * 业务表的行都有数字 `id`（传输层主键）与业务单号 `code`（展示用），
 * 因此增删改不需要为每张表单独实现一套接口。
 */

/** 业务表名：与 `src/mocks/seed-biz.ts` 的键一致 */
export type BizTable =
    | 'bizOrder'
    | 'bizPayment'
    | 'bizRefund'
    | 'bizWithdrawal'
    | 'bizPendWd'
    | 'bizAccount'
    | 'bizPayoutAccount'
    | 'bizEntity'
    | 'bizChannel'
    | 'bizExportJob';

export const bizKeys = {
    table: (table: BizTable) => ['biz', table] as const,
    rule: ['biz', 'bizPayRule'] as const,
    tradeRule: ['biz', 'bizTradeRule'] as const,
};

/** 整表读取：业务表都很小（订单 / 单据量级），一次取回在页面内筛，比逐条件打接口可读 */
export function useBizRows<T>(table: BizTable, enabled = true) {
    return useQuery({
        queryKey: bizKeys.table(table),
        queryFn: () => http.get<T[]>(`/api-backend/biz/${table}/listAll`),
        placeholderData: keepPreviousData,
        enabled,
    });
}

export function useBizUpdate<T>(table: BizTable) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: ({ id, body }: { id: number; body: Partial<T> }) =>
            http.put<null>(`/api-backend/biz/${table}/update/${id}`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: bizKeys.table(table) }),
    });
}

export function useBizCreate<T>(table: BizTable) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Partial<T>) => http.post<{ id: number }>(`/api-backend/biz/${table}/create`, body),
        onSuccess: () => qc.invalidateQueries({ queryKey: bizKeys.table(table) }),
    });
}

export function useBizDelete(table: BizTable) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/biz/${table}/delete/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: bizKeys.table(table) }),
    });
}

/* ---------- 收付规则（单行配置） ---------- */

export function usePayRule<T>() {
    return useQuery({
        queryKey: bizKeys.rule,
        queryFn: () => http.get<T>('/api-backend/biz/bizPayRule/get/1'),
    });
}

export function useSavePayRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => http.put<null>('/api-backend/biz/bizPayRule/update/1', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: bizKeys.rule }),
    });
}

/** 交易规则：与提现规则分开两张表 —— 两者结算时点不同，改错一格会同时改掉两条业务线 */
export function useTradeRule<T>() {
    return useQuery({
        queryKey: bizKeys.tradeRule,
        queryFn: () => http.get<T>('/api-backend/biz/bizTradeRule/get/1'),
    });
}

export function useSaveTradeRule() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: Record<string, unknown>) => http.put<null>('/api-backend/biz/bizTradeRule/update/1', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: bizKeys.tradeRule }),
    });
}
