/**
 * 与后端契约（weiran4j/docs/01-架构与接口契约.md §4、§6）一一对应的类型。
 * 字段名不要自行改动；契约变了先改文档再改这里。
 */

/** 统一响应：code 为数字，0 表示成功 */
export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

export interface PageResult<T> {
    list: T[];
    total: number;
    page: number;
    pageSize: number;
}

export interface PageQuery {
    page?: number;
    pageSize?: number;
}

export type Status = 'enabled' | 'disabled';
export type Gender = 'male' | 'female' | 'unknown';

/* ---------- 认证 ---------- */

export interface LoginRequest {
    username: string;
    password: string;
}

export interface LoginResult {
    accessToken: string;
    tokenType: 'Bearer';
    expiresIn: number;
}

export interface CurrentUserView {
    id: number;
    username: string;
    nickname: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    gender: Gender | null;
    departmentId: number | null;
    departmentName: string | null;
    roles: string[];
    permissions: string[];
}

export interface ProfileUpdateRequest {
    nickname: string;
    email?: string | null;
    phone?: string | null;
    avatar?: string | null;
    gender?: Gender | null;
}

export interface PasswordChangeRequest {
    oldPassword: string;
    newPassword: string;
}

/* ---------- 菜单 ---------- */

export type MenuType = 'directory' | 'menu' | 'button';

export interface MenuNode {
    id: number;
    parentId: number;
    title: string;
    type: MenuType;
    path: string | null;
    component: string | null;
    icon: string | null;
    permission: string | null;
    sort: number;
    visible: boolean;
    keepAlive: boolean;
    isExternal: boolean;
    status: Status;
    children: MenuNode[];
}

export interface MenuSaveRequest {
    parentId: number;
    title: string;
    type: MenuType;
    path?: string | null;
    component?: string | null;
    icon?: string | null;
    permission?: string | null;
    sort?: number;
    visible?: boolean;
    keepAlive?: boolean;
    isExternal?: boolean;
    status?: Status;
}

/* ---------- 用户 ---------- */

export interface UserView {
    id: number;
    username: string;
    nickname: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
    gender: Gender | null;
    departmentId: number | null;
    departmentName: string | null;
    status: Status;
    isBuiltin: boolean;
    roleIds: number[];
    roleNames: string[];
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    createdAt: string;
    updatedAt: string;
}

export interface UserQuery extends PageQuery {
    keyword?: string;
    status?: Status;
    departmentId?: number;
}

export interface UserCreateRequest {
    username: string;
    nickname: string;
    password: string;
    email?: string | null;
    phone?: string | null;
    gender?: Gender | null;
    departmentId?: number | null;
    status?: Status;
    roleIds: number[];
}

export type UserUpdateRequest = Omit<UserCreateRequest, 'username' | 'password'>;

export interface UserOption {
    id: number;
    username: string;
    nickname: string;
}

/* ---------- 角色 ---------- */

export interface RoleView {
    id: number;
    name: string;
    code: string;
    description: string | null;
    sort: number;
    status: Status;
    isBuiltin: boolean;
    userCount: number;
    createdAt: string;
    updatedAt: string;
}

export interface RoleDetail extends RoleView {
    menuIds: number[];
}

export interface RoleQuery extends PageQuery {
    keyword?: string;
    status?: Status;
}

export interface RoleSaveRequest {
    name: string;
    code: string;
    description?: string | null;
    sort?: number;
    status?: Status;
}

export interface RoleOption {
    id: number;
    name: string;
    code: string;
}

/* ---------- 部门 ---------- */

export interface DepartmentNode {
    id: number;
    parentId: number;
    name: string;
    code: string;
    leaderId: number | null;
    leaderName: string | null;
    phone: string | null;
    sort: number;
    status: Status;
    createdAt: string;
    children: DepartmentNode[];
}

export interface DepartmentSaveRequest {
    parentId: number;
    name: string;
    code: string;
    leaderId?: number | null;
    phone?: string | null;
    sort?: number;
    status?: Status;
}

/* ---------- 字典 ---------- */

export interface DictView {
    id: number;
    name: string;
    code: string;
    description: string | null;
    status: Status;
    isBuiltin: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface DictQuery extends PageQuery {
    keyword?: string;
    status?: Status;
}

export interface DictSaveRequest {
    name: string;
    code: string;
    description?: string | null;
    status?: Status;
}

export interface DictItemView {
    id: number;
    dictId: number;
    label: string;
    value: string;
    color: string | null;
    sort: number;
    status: Status;
    remark: string | null;
}

export interface DictItemSaveRequest {
    label: string;
    value: string;
    color?: string | null;
    sort?: number;
    status?: Status;
    remark?: string | null;
}

/* ---------- 系统配置 ---------- */

export type ConfigType = 'string' | 'number' | 'boolean' | 'json';

export interface ConfigView {
    id: number;
    configKey: string;
    configValue: string;
    configType: ConfigType;
    description: string | null;
    isBuiltin: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface ConfigQuery extends PageQuery {
    keyword?: string;
}

export interface ConfigSaveRequest {
    configKey: string;
    configValue: string;
    configType: ConfigType;
    description?: string | null;
}

/* ---------- 日志 ---------- */

export interface LoginLogView {
    id: number;
    userId: number | null;
    username: string;
    ip: string | null;
    browser: string | null;
    os: string | null;
    userAgent: string | null;
    eventType: 'login' | 'logout';
    status: 'success' | 'fail';
    message: string | null;
    createdAt: string;
}

export interface LoginLogQuery extends PageQuery {
    username?: string;
    status?: 'success' | 'fail';
    eventType?: 'login' | 'logout';
    startTime?: string;
    endTime?: string;
}

/** 契约 §6.9 未逐字段列出，按 §5 sys_operation_log 列的 camelCase 形式 */
export interface OperationLogView {
    id: number;
    userId: number | null;
    username: string | null;
    module: string;
    description: string;
    method: string;
    path: string;
    requestBody?: string | null;
    responseCode: number;
    success: boolean;
    errorMessage: string | null;
    durationMs: number;
    ip: string | null;
    userAgent: string | null;
    createdAt: string;
}

export interface OperationLogQuery extends PageQuery {
    username?: string;
    module?: string;
    success?: boolean;
    startTime?: string;
    endTime?: string;
}

export interface IdResult {
    id: number;
}
