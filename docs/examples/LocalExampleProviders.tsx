import React, { useEffect, useRef, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { DEFAULT_UPLOAD_SETTINGS } from '@weiran-tech/semi-components';
import { PermissionContext } from '../../packages/manage/src/hooks/usePermission';
import { PreferencesContext, defaultPreferences } from '../../packages/manage/src/hooks/usePreferences';
import { dictKeys } from '../../packages/manage/src/hooks/queries/dicts';
import { systemMediaKeys } from '../../packages/manage/src/hooks/queries/system-media';

/** 只为接口适配组件提供本地 lookup；所有自动读取关闭，禁止回落到业务接口。 */
export function LocalExampleProviders({ children, permissions = ['*'] }: { children: ReactNode; permissions?: string[] }) {
    const [client] = useState(() => {
        const queryClient = new QueryClient({ defaultOptions: { queries: { enabled: false, retry: false, staleTime: Infinity } } });
        queryClient.setQueryData(systemMediaKeys.uploadSettings, DEFAULT_UPLOAD_SETTINGS);
        for (const [code, options] of Object.entries({
            sys_common_status: [['enabled', '启用'], ['disabled', '禁用']],
            sys_user_gender: [['male', '男'], ['female', '女']],
        })) queryClient.setQueryData(dictKeys.byCode(code), options.map(([value, label], index) => ({ id: index + 1, value, label, status: 'enabled', color: null })));
        return queryClient;
    });
    useEffect(() => () => client.clear(), [client]);
    return <QueryClientProvider client={client}><PreferencesContext.Provider value={{ preferences: defaultPreferences, setPreferences: () => undefined, resetPreferences: () => undefined }}><PermissionContext.Provider value={permissions}>{children}</PermissionContext.Provider></PreferencesContext.Provider></QueryClientProvider>;
}

export function useLocalUpload(fail = false) {
    const urls = useRef<string[]>([]);
    useEffect(() => () => { urls.current.forEach((url) => URL.revokeObjectURL(url)); }, []);
    return async (file: File, onProgress?: (percent: number) => void) => {
        onProgress?.(30);
        await new Promise((resolve) => setTimeout(resolve, 300));
        if (fail) throw new Error('模拟上传失败');
        const url = URL.createObjectURL(file);
        urls.current.push(url);
        onProgress?.(100);
        return url;
    };
}
