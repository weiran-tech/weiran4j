import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toQueryString } from '@/lib/query';
import { http } from '@/utils/request';
import type {
    SystemMediaFileQuery,
    SystemMediaFileUpload,
    SystemMediaFileView,
    SystemMediaUploadSettings,
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

/** 本地 Mock 上传；不连接对象存储或后端。 */
export async function uploadSystemFile(file: File, onProgress?: (percent: number) => void): Promise<SystemMediaFileUpload> {
    const body = new FormData();
    body.append('file', file);
    onProgress?.(0);
    const uploaded = await http.post<SystemMediaFileUpload>('/api-backend/system/media/uploadFile', body,
        onProgress ? { onUploadProgress: onProgress } : undefined);
    onProgress?.(100);
    return uploaded;
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
    const mutation = useMutation({
        mutationFn: (file: File) => uploadSystemFile(file),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: systemMediaKeys.all }),
    });
    return {
        ...mutation,
        uploadWithProgress: async (file: File, onProgress: (percent: number) => void) => {
            const uploaded = await uploadSystemFile(file, onProgress);
            void queryClient.invalidateQueries({ queryKey: systemMediaKeys.all });
            return uploaded;
        },
    };
}

export function useDeleteSystemMediaFile() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: (id: number) => http.delete<null>(`/api-backend/system/mediaLibrary/delete/${id}`, { silent: true }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: systemMediaKeys.all }),
    });
}
