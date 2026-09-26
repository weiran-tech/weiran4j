import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type { LoginLogQuery, LoginLogView, OperationLogQuery, OperationLogView, PageResult } from '@/types/api';

export const logKeys = {
    login: (q: LoginLogQuery) => ['login-logs', q] as const,
    operation: (q: OperationLogQuery) => ['operation-logs', 'list', q] as const,
    operationDetail: (id: number) => ['operation-logs', 'detail', id] as const,
};

export function useLoginLogs(query: LoginLogQuery) {
    return useQuery({
        queryKey: logKeys.login(query),
        queryFn: () => http.get<PageResult<LoginLogView>>(`/api/login-logs${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useOperationLogs(query: OperationLogQuery) {
    return useQuery({
        queryKey: logKeys.operation(query),
        queryFn: () => http.get<PageResult<OperationLogView>>(`/api/operation-logs${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useOperationLogDetail(id: number | null) {
    return useQuery({
        queryKey: logKeys.operationDetail(id ?? 0),
        queryFn: () => http.get<OperationLogView>(`/api/operation-logs/${id}`),
        enabled: id !== null,
    });
}
