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

export function uploadSystemFile(file: File) {
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
