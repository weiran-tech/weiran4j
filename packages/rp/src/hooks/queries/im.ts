import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type {
    ChatConvQuery,
    ChatConvView,
    ChatMessageSaveRequest,
    ChatMessageView,
    IdResult,
    PageResult,
    QuietConfigSaveRequest,
    QuietConfigView,
    QuickReplySaveRequest,
    QuickReplyView,
    RecallConfigSaveRequest,
    RecallConfigView,
    RoutingFallbackSaveRequest,
    RoutingFallbackView,
    RoutingRuleSaveRequest,
    RoutingRuleView,
    SensitiveWordSaveRequest,
    SensitiveWordView,
    StaffQuery,
    StaffSaveRequest,
    StaffView,
} from '@/types/api';

export const imKeys = {
    all: ['im'] as const,
    staffList: (query: StaffQuery) => ['im', 'staff', 'list', query] as const,
    staffAll: ['im', 'staff', 'all'] as const,
    routingRule: ['im', 'routingRule'] as const,
    routingFallback: ['im', 'routingFallback'] as const,
    quietConfig: ['im', 'quietConfig'] as const,
    recallConfig: ['im', 'recallConfig'] as const,
    quickReply: ['im', 'quickReply'] as const,
    sensitiveWord: ['im', 'sensitiveWord'] as const,
    chatConvList: (query: ChatConvQuery) => ['im', 'chatConv', 'list', query] as const,
    chatConvAll: ['im', 'chatConv', 'all'] as const,
    chatMessage: ['im', 'chatMessage'] as const,
};

function useList<T>(resource: string) {
    return useQuery({
        queryKey: ['im', resource],
        queryFn: () => http.get<T[]>(`/api-backend/im/${resource}/listAll`),
    });
}

/** 任意 IM Mock 表的保存：无 id 新增，有 id 更新 */
function useSave<T>(resource: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id?: number; body: Partial<T> }) =>
            args.id === undefined
                ? http.post<IdResult>(`/api-backend/im/${resource}/create`, args.body)
                : http.put<null>(`/api-backend/im/${resource}/update/${args.id}`, args.body),
        onSuccess: () => qc.invalidateQueries({ queryKey: imKeys.all }),
    });
}

function useRemove(resource: string) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/im/${resource}/delete/${id}`),
        onSuccess: () => qc.invalidateQueries({ queryKey: imKeys.all }),
    });
}

/* ---------- 客服列表 ---------- */

export function useStaffList(query: StaffQuery) {
    return useQuery({
        queryKey: imKeys.staffList(query),
        queryFn: () => http.get<PageResult<StaffView>>(`/api-backend/im/staff/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useStaffAll() {
    return useQuery({
        queryKey: imKeys.staffAll,
        queryFn: () => http.get<StaffView[]>('/api-backend/im/staff/listAll'),
    });
}

export const useSaveStaff = () => useSave<StaffSaveRequest>('staff');
export const useDeleteStaff = () => useRemove('staff');

/* ---------- 分组与分流 ---------- */

export const useRoutingRules = () => useList<RoutingRuleView>('routingRule');
export const useSaveRoutingRule = () => useSave<RoutingRuleSaveRequest>('routingRule');
export const useDeleteRoutingRule = () => useRemove('routingRule');

export const useRoutingFallbacks = () => useList<RoutingFallbackView>('routingFallback');
export const useSaveRoutingFallback = () => useSave<RoutingFallbackSaveRequest>('routingFallback');

/* ---------- 客服配置 ---------- */

export const useQuietConfigs = () => useList<QuietConfigView>('quietConfig');
export const useSaveQuietConfig = () => useSave<QuietConfigSaveRequest>('quietConfig');

export const useRecallConfig = () => useList<RecallConfigView>('recallConfig');
export const useSaveRecallConfig = () => useSave<RecallConfigSaveRequest>('recallConfig');

export const useQuickReplies = () => useList<QuickReplyView>('quickReply');
export const useSaveQuickReply = () => useSave<QuickReplySaveRequest>('quickReply');
export const useDeleteQuickReply = () => useRemove('quickReply');

export const useSensitiveWords = () => useList<SensitiveWordView>('sensitiveWord');
export const useSaveSensitiveWord = () => useSave<SensitiveWordSaveRequest>('sensitiveWord');
export const useDeleteSensitiveWord = () => useRemove('sensitiveWord');

/* ---------- 会话与群 ---------- */

export function useChatConvList(query: ChatConvQuery) {
    return useQuery({
        queryKey: imKeys.chatConvList(query),
        queryFn: () => http.get<PageResult<ChatConvView>>(`/api-backend/im/chatConv/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useChatConvAll() {
    return useQuery({
        queryKey: imKeys.chatConvAll,
        queryFn: () => http.get<ChatConvView[]>('/api-backend/im/chatConv/listAll'),
    });
}

export const useSaveChatConv = () => useSave<Partial<ChatConvView>>('chatConv');

export function useChatMessages() {
    return useQuery({
        queryKey: imKeys.chatMessage,
        queryFn: () => http.get<ChatMessageView[]>('/api-backend/im/chatMessage/listAll'),
    });
}

export const useSaveChatMessage = () => useSave<ChatMessageSaveRequest>('chatMessage');
