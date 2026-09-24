import { get, post } from './api';

/** 分页请求参数，与后端 `PageQuery` 对齐。 */
export interface PageParams {
    page: number;
    size: number;
}

/** 分页响应，与后端 `PageResult` 对齐。 */
export interface PageResult<T> {
    items: T[];
    total: number;
    page: number;
    size: number;
}

/** 角色视图，字段与后端 `RoleView` record 对齐。 */
export interface RoleView {
    id: number;
    name: string;
    title: string;
    description: string;
    accountType: string;
    enabled: boolean;
    system: boolean;
}

/** 角色详情视图，字段与后端 `RoleDetailView` record 对齐。 */
export interface RoleDetailView {
    role: RoleView;
    permissionIds: number[];
}

/** 权限点视图，字段与后端 `PermissionView` record 对齐。 */
export interface PermissionView {
    id: number;
    name: string;
    title: string;
    group: string;
    module: string;
}

export interface RoleQuery extends PageParams {
    accountType?: string;
    enabled?: boolean;
}

export interface CreateRolePayload {
    name: string;
    title: string;
    description: string;
    accountType: string;
}

export interface UpdateRolePayload {
    title: string;
    description: string;
    enabled: boolean;
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

/** 分页查询角色列表。 */
export function listRoles(query: RoleQuery): Promise<PageResult<RoleView>> {
    return get<PageResult<RoleView>>(`/api/v1/roles${buildQueryString(query)}`);
}

/** 查角色详情，附带已绑定权限 ID 集合。 */
export function fetchRoleDetail(id: number): Promise<RoleDetailView> {
    return get<RoleDetailView>(`/api/v1/roles/${id}`);
}

/** 新增角色。 */
export function createRole(payload: CreateRolePayload): Promise<RoleView> {
    return post<RoleView>('/api/v1/roles', payload);
}

/** 编辑角色。系统内置角色的 name 不在这个请求体里，天然不可改。 */
export function updateRole(id: number, payload: UpdateRolePayload): Promise<RoleView> {
    return post<RoleView>(`/api/v1/roles/${id}/update`, payload);
}

/** 删除角色。走 POST 语义化路径，不使用 DELETE 动词（与后端 API 设计一致）。 */
export function deleteRole(id: number): Promise<void> {
    return post<void>(`/api/v1/roles/${id}/delete`, {});
}

/** 整体替换角色的权限集合。 */
export function assignRolePermissions(id: number, permissionIds: number[]): Promise<void> {
    return post<void>(`/api/v1/roles/${id}/permissions`, { permissionIds });
}

/** 查全部权限点，供权限树渲染。 */
export function listAllPermissions(): Promise<PermissionView[]> {
    return get<PermissionView[]>('/api/v1/permissions');
}
