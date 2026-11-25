import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { MfaSettingsUpdateRequest, PasswordRulesUpdateRequest, SecuritySettingsView } from '@/types/api';
import { http } from '@/utils/request';

const key = ['security', 'settings'] as const;

export function useSecuritySettings() {
    return useQuery({ queryKey: key, queryFn: () => http.get<SecuritySettingsView>('/api-backend/system/security/get') });
}

export function useUpdatePasswordRules() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: PasswordRulesUpdateRequest) => http.put<null>('/api-backend/system/security/updatePasswordRules', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
}

export function useUpdateMfaSettings() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (body: MfaSettingsUpdateRequest) => http.put<null>('/api-backend/system/security/updateMfa', body),
        onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    });
}
