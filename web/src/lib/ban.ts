import { get, post } from './api';
import type { PageResult } from './role';

/** 封禁记录视图，字段与后端 `BanView` record 对齐。 */
export interface BanView {
    id: number;
    accountType: string;
    type: string;
    value: string;
    ipStart: number;
    ipEnd: number;
    note: string | null;
    createdAt: string;
}

export interface BanQuery {
    page: number;
    size: number;
    type?: string;
    accountType?: string;
}

export interface CreateBanPayload {
    accountType: string;
    type: string;
    value: string;
    ipStart: number;
    ipEnd: number;
    note?: string | undefined;
}

export interface UpdateBanPayload {
    value: string;
    ipStart: number;
    ipEnd: number;
    note?: string | undefined;
}

function buildQueryString(params: object): string {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) {
            search.set(key, String(value as string | number | boolean));
        }
    }
    const query = search.toString();
    return query ? `?${query}` : '';
}

/** 分页查询封禁记录列表。 */
export function listBans(query: BanQuery): Promise<PageResult<BanView>> {
    return get<PageResult<BanView>>(`/api/v1/bans${buildQueryString(query)}`);
}

/** 新增封禁记录。 */
export function createBan(payload: CreateBanPayload): Promise<BanView> {
    return post<BanView>('/api/v1/bans', payload);
}

/** 编辑封禁记录。 */
export function updateBan(id: number, payload: UpdateBanPayload): Promise<BanView> {
    return post<BanView>(`/api/v1/bans/${id}/update`, payload);
}

/** 删除封禁记录，即解除该条封禁。走 POST 语义化路径。 */
export function deleteBan(id: number): Promise<void> {
    return post<void>(`/api/v1/bans/${id}/delete`, {});
}
