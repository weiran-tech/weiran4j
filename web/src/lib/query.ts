import { QueryClient } from '@tanstack/react-query';

/** 构建查询字符串：过滤 undefined / null / 空字符串，非空时带 `?` 前缀 */
export function toQueryString(params: object): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value === undefined || value === null || value === '') continue;
        search.set(key, String(value));
    }
    const qs = search.toString();
    return qs ? `?${qs}` : '';
}

/** 变化频率低的 lookup 数据（字典项、部门树、下拉源）的 staleTime */
export const LOOKUP_STALE_TIME = 5 * 60 * 1000;

export function createQueryClient() {
    return new QueryClient({
        defaultOptions: {
            queries: {
                staleTime: 30_000,
                // 业务错误重试没有意义，只会让用户多等几次才看到提示
                retry: false,
                refetchOnWindowFocus: false,
            },
            mutations: { retry: false },
        },
    });
}

export const queryClient = createQueryClient();
