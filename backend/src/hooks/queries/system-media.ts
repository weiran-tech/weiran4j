import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Toast } from '@douyinfe/semi-ui';
import { toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import { getSession } from '@/utils/session';
import type {
    SystemMediaFileQuery,
    SystemMediaFileUpload,
    SystemMediaFileView,
    SystemMediaUploadSettings,
    SystemMediaDirectUploadAuthorization,
    PageResult,
} from '@/types/api';

export const systemMediaKeys = {
    all: ['system-media'] as const,
    uploadSettings: ['system-media', 'upload-settings'] as const,
    page: (query: SystemMediaFileQuery) => [...systemMediaKeys.all, query] as const,
};

export function useUploadSettings() {
    return useQuery({
        queryKey: systemMediaKeys.uploadSettings,
        queryFn: () => http.get<SystemMediaUploadSettings>('/api-backend/system/media/getUploadSettings'),
    });
}

let directAuthorization: SystemMediaDirectUploadAuthorization | null | undefined;
let authorizationExpiresAt = 0;
let pendingAuthorization: Promise<SystemMediaDirectUploadAuthorization | null> | undefined;
let authorizationSession: string | null | undefined;

async function getDirectAuthorization(): Promise<SystemMediaDirectUploadAuthorization | null> {
    const session = getSession();
    if (authorizationSession !== session) {
        directAuthorization = undefined;
        authorizationExpiresAt = 0;
        pendingAuthorization = undefined;
        authorizationSession = session;
    }
    if (directAuthorization !== undefined && Date.now() < authorizationExpiresAt - 60_000) return directAuthorization;
    if (pendingAuthorization) return pendingAuthorization;
    const request = http.get<SystemMediaDirectUploadAuthorization | null>(
        '/api-backend/system/media/getDirectUploadAuthorization',
    ).then((authorization) => {
        if (authorizationSession === session) {
            directAuthorization = authorization;
            authorizationExpiresAt = authorization ? Date.parse(authorization.expiresAt) : Date.now() + 5 * 60_000;
        }
        return authorization;
    }).finally(() => { if (pendingAuthorization === request) pendingAuthorization = undefined; });
    pendingAuthorization = request;
    return request;
}

export async function uploadSystemFile(file: File): Promise<SystemMediaFileUpload> {
    const authorization = await getDirectAuthorization();
    if (authorization) {
        const extension = file.name.split('.').pop()?.toLowerCase();
        if (!extension || !/^[a-z0-9]{2,5}$/.test(extension)) throw new Error('文件扩展名无效');
        const objectName = `${authorization.keyPrefix}${crypto.randomUUID()}.${extension}`;
        const body = new FormData();
        body.append('key', objectName);
        body.append('OSSAccessKeyId', authorization.accessKeyId);
        body.append('policy', authorization.policy);
        body.append('Signature', authorization.signature);
        body.append('success_action_status', '204');
        body.append('x-oss-forbid-overwrite', 'true');
        body.append('file', file);
        let response: Response;
        try {
            response = await fetch(authorization.uploadUrl, { method: 'POST', body, credentials: 'omit' });
        } catch (error) {
            Toast.error('对象存储连接失败，请检查网络与 OSS 跨域配置');
            throw error;
        }
        if (!response.ok) {
            if (response.status === 403) directAuthorization = undefined;
            Toast.error(`对象存储上传失败（HTTP ${response.status}）`);
            throw new Error(`对象存储上传失败（HTTP ${response.status}）`);
        }
        return http.post<SystemMediaFileUpload>('/api-backend/system/media/completeDirectUpload', {
            originalName: file.name,
            objectName,
            size: file.size,
            ticket: authorization.ticket,
        });
    }
    const body = new FormData();
    body.append('file', file);
    return http.post<SystemMediaFileUpload>('/api-backend/system/media/uploadFile', body);
}

export function useSystemMediaFiles(query: SystemMediaFileQuery) {
    return useQuery({
        queryKey: systemMediaKeys.page(query),
        queryFn: () => http.get<PageResult<SystemMediaFileView>>(`/api-backend/system/mediaLibrary/list${toQueryString(query)}`),
        placeholderData: keepPreviousData,
    });
}

export function useUploadSystemFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: uploadSystemFile,
        onSuccess: () => queryClient.invalidateQueries({ queryKey: systemMediaKeys.all }),
    });
}

export function useDeleteSystemMediaFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/system/mediaLibrary/delete/${id}`, { silent: true }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: systemMediaKeys.all }),
    });
}
