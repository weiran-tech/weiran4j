/** 原型页面数据契约，由 src/mocks/seed.ts 与 transport.ts 提供。 */

/** 统一响应：code 为数字，0 表示成功 */
export interface ApiResponse<T> {
    code: number;
    message: string;
    data: T;
}

/** 失败响应体（契约 §4）：比成功体多 requestId，与响应头 X-Request-Id 一致；成功体没有该键 */
export type ApiErrorBody = { code: number; message: string; data: null; requestId?: string };

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

export interface PhoneLoginCodeRequest {
    phone: string;
}

export interface PhoneLoginRequest {
    phone: string;
    code: string;
}

/**
 * POST /api-backend/n/system/auth/login 的响应（契约 §6.1）。默认模式下令牌只走 HttpOnly Cookie，
 * `accessToken` 为 null 或缺省，前端两种都按「没有」处理、也不读它；`X-Auth-Mode: token` 时才有值（给非浏览器客户端）。
 */
export interface LoginResult {
    accessToken?: string | null;
    tokenType?: string | null;
    expiresIn: number;
    userId: number;
    mfaRequired?: boolean;
    maskedPhone?: string | null;
}

export interface CurrentUserView {
    id: number;
    username: string;
    nickname: string;
    phone: string | null;
    avatar: UserAvatar | null;
    gender: Gender | null;
    roles: string[];
    permissions: string[];
    /** false = 没有本地密码（外部身份自动开通的用户）：密码登录、锁屏校验一律 110101，不能改密码 */
    hasPassword: boolean;
}

export interface ProfileUpdateRequest {
    nickname: string;
    avatar?: UserAvatar | null;
    gender?: Gender | null;
}

export interface UpdateOwnUsernameRequest {
    username: string;
}

export interface UserAvatar {
    text: string;
    background: string;
}

export interface BindPhoneRequest {
    phone: string;
    code: string;
}

export interface PasswordChangeRequest {
    oldPassword: string;
    newPassword: string;
}

export interface SecuritySettingsView {
    passwordMinLength: number;
    passwordMaxLength: number;
    requireLower: boolean;
    requireUpper: boolean;
    requireDigit: boolean;
    requireSymbol: boolean;
    mfaEnabled: boolean;
    mfaRememberDays: number;
    revision: number;
}

export type PasswordRulesUpdateRequest = Pick<SecuritySettingsView, 'requireLower' | 'requireUpper' | 'requireDigit' | 'requireSymbol'> & {
    minLength: number;
    maxLength: number;
};

export interface MfaSettingsUpdateRequest {
    enabled: boolean;
    rememberDays: number;
}

/** PUT /api-backend/system/auth/updateFavoriteMenus：全量覆盖；重复 id 静默去重保序，去重后 ≤ 50 */
export interface FavoriteMenusSaveRequest {
    menuIds: number[];
}

/** POST /api-backend/system/auth/verifyPassword：锁屏解锁；错误返回 110101，不影响会话 */
export interface VerifyPasswordRequest {
    password: string;
}

/** POST /api-backend/system/auth/logout 的响应：会话来自配置了登出的外部身份提供方时为其登出地址，前端整页跳转；否则 null */
export interface LogoutResult {
    ssoLogoutUrl: string | null;
}

/* ---------- 外部身份（契约 §6.1、§6.2，D-015） ---------- */

export type ProviderType = 'oidc' | 'cas';

export interface ProviderView {
    id: string;
    type: ProviderType;
    name: string;
}

/** GET /api-backend/n/system/auth/listProviders（公开）：只含已启用的提供方 */
export interface ProvidersView {
    passwordLoginEnabled: boolean;
    phoneLoginEnabled?: boolean;
    providers: ProviderView[];
}

/** 已绑定的外部身份：本人 `/api-backend/system/auth/listCurrentIdentities`，管理员 `/api-backend/system/user/listIdentities/{id}` 结构相同 */
export interface UserIdentityView {
    id: number;
    provider: string;
    providerName: string;
    externalId: string;
    displayName: string | null;
    createdAt: string;
}

/** POST /api-backend/system/user/createIdentity/{id} */
export interface BindIdentityRequest {
    provider: string;
    externalId: string;
    displayName?: string;
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
    phone: string | null;
    avatar: UserAvatar | null;
    gender: Gender | null;
    status: Status;
    isBuiltin: boolean;
    roleIds: number[];
    roleNames: string[];
    lastLoginAt: string | null;
    lastLoginIp: string | null;
    createdAt: string;
    updatedAt: string;
}

/** `GET /api-backend/system/user/list` 查询参数（契约 §6.2）：`keyword` 为三列模糊的快速搜索，其余为高级筛选的单字段条件 */
export interface UserQuery extends PageQuery {
    keyword?: string;
    status?: Status;
    /** 用户名，精确匹配 */
    username?: string;
    userId?: number;
    /** 手机号，精确匹配 */
    phone?: string;
    /** 拥有该角色 */
    roleId?: number;
    gender?: Gender;
    /** `yyyy-MM-dd HH:mm:ss`，闭区间 */
    createdStartTime?: string;
    createdEndTime?: string;
    /** `yyyy-MM-dd HH:mm:ss`，闭区间；传任一端即排除从未登录的用户 */
    lastLoginStartTime?: string;
    lastLoginEndTime?: string;
}

export interface UserCreateRequest {
    username: string;
    nickname: string;
    password: string;
    phone?: string | null;
    gender?: Gender | null;
    status?: Status;
    roleIds: number[];
}

export type UserUpdateRequest = Omit<UserCreateRequest, 'username' | 'password' | 'phone'>;

/** PUT /api-backend/system/user/updateAccountField/{id}：管理员单字段设置账号标识 */
export type UserAccountField = 'username' | 'phone';

export interface UserAccountFieldUpdateRequest {
    field: UserAccountField;
    value: string;
}

/* ---------- IM 与客服 ---------- */

export type StaffStatus = 'online' | 'busy' | 'offline';

export interface StaffView {
    id: number;
    /** 客服账号，如 K1001 */
    code: string;
    name: string;
    status: StaffStatus;
    enabled: boolean;
    /** 当前接待会话数 */
    load: number;
    /** 接待上限 */
    max: number;
    /** 今日接待 */
    today: number;
    /** 平均首响（秒） */
    firstResp: number;
    /** 评分 */
    score: number;
    phone: string;
    joinDate: string;
    color: string;
}

export interface StaffQuery extends PageQuery {
    keyword?: string;
    status?: StaffStatus;
}

export type StaffSaveRequest = Omit<StaffView, 'id'>;

/** 分流场景：售前群 / 交易群 */
export type RoutingScene = 'presale' | 'trade';

export interface RoutingRuleView {
    id: number;
    scene: RoutingScene;
    /** 金额下限（含） */
    min: number;
    /** 金额上限（不含），null 表示不封顶 */
    max: number | null;
    staffNames: string[];
    mode: 'count' | 'all';
    count: number;
    sort: number;
}

export type RoutingRuleSaveRequest = Omit<RoutingRuleView, 'id'>;

export interface RoutingFallbackView {
    id: number;
    scene: RoutingScene;
    staffNames: string[];
    mode: 'count' | 'all';
    count: number;
}

export type RoutingFallbackSaveRequest = Omit<RoutingFallbackView, 'id'>;

export interface QuietConfigView {
    id: number;
    scene: RoutingScene;
    on: boolean;
    /** HH:mm */
    start: string;
    /** HH:mm */
    end: string;
    timing: string;
    prompt: string;
}

export type QuietConfigSaveRequest = Omit<QuietConfigView, 'id'>;

export interface RecallConfigView {
    id: number;
    allow: boolean;
    allowUser: boolean;
    /** 撤回时间窗口（分钟），-1 表示永久 */
    windowMinutes: number;
}

export type RecallConfigSaveRequest = Omit<RecallConfigView, 'id'>;

export interface QuickReplyView {
    id: number;
    group: string;
    text: string;
    uses: number;
}

export type QuickReplySaveRequest = Omit<QuickReplyView, 'id'>;

export interface SensitiveWordView {
    id: number;
    word: string;
    type: string;
    level: string;
    match: string;
    action: string;
    hits: number;
    on: boolean;
}

export type SensitiveWordSaveRequest = Omit<SensitiveWordView, 'id'>;

/** 会话类型：售前群 / 交易群 */
export type ConvType = 'presale' | 'trade';
/** 会话状态：进行中 / 待回复 / 已挂起 / 已关闭 */
export type ConvStatus = 'active' | 'pending' | 'suspended' | 'closed';

export interface ConvMemberView {
    name: string;
    role: string;
    online: boolean;
}

export interface ChatConvView {
    id: number;
    groupId: string;
    title: string;
    buyer: string;
    buyerAvatar: string;
    buyerColor: string;
    type: ConvType;
    status: ConvStatus;
    assignee: string;
    unread: number;
    lastMessage: string;
    lastTime: string;
    buyerOnline: boolean;
    level: string;
    phone: string;
    uid: string;
    registered: string;
    source: string;
    orders: number;
    gmv: number;
    tags: string[];
    members: ConvMemberView[];
    orderId: string;
    orderTitle: string;
    orderPrice: number;
    orderStatus: string;
    seller: string;
}

export interface ChatConvQuery extends PageQuery {
    keyword?: string;
    type?: ConvType;
    status?: ConvStatus;
}

export interface ChatMessageView {
    id: number;
    convId: number;
    role: 'sys' | 'user' | 'agent' | 'seller';
    name: string;
    time: string;
    text: string;
}

export type ChatMessageSaveRequest = Omit<ChatMessageView, 'id'>;

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

/* ---------- 行政区划 ---------- */

export type RegionLevel = 'province' | 'city' | 'county';

export interface RegionView {
    id: number;
    code: string;
    name: string;
    level: RegionLevel;
    parentCode: string | null;
    sort: number;
    status: Status;
    createdAt: string;
    updatedAt: string;
}

export interface RegionNode extends RegionView {
    children: RegionNode[];
}

export interface RegionQuery {
    keyword?: string;
    level?: RegionLevel;
    status?: Status;
}

export interface RegionSaveRequest {
    code: string;
    name: string;
    level: RegionLevel;
    parentCode?: string | null;
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
    /** HTTP compatibility field; persisted as sys_dict_item.group_id. */
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
export type ConfigFieldType = 'input' | 'textarea' | 'number' | 'switch' | 'select' | 'json' | 'files' | 'file' | 'image' | 'video' | 'richtext';

export interface ConfigGroupView {
    groupKey: string;
    key: string;
    label: string;
    isBuiltin: boolean;
    canDelete: boolean;
    createdAt: string | null;
}

export interface ConfigGroupSaveRequest {
    groupKey?: 'config_system' | 'config_sms';
    key: string;
    label: string;
}

export interface ConfigGroupUpdateRequest {
    label: string;
}

export interface ConfigView {
    id: number;
    configKey: string;
    configValue: string;
    configType: ConfigType;
    groupKey: string;
    fieldType: ConfigFieldType;
    fieldOptions: string | null;
    required: boolean;
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
    groupKey: string;
    fieldType: ConfigFieldType;
    fieldOptions?: string | null;
    required: boolean;
    description?: string | null;
}

/* ---------- 系统媒体库 ---------- */

export interface SystemMediaUploadSettings {
    imageFormats: string[];
    imageMaxSizeMb: number;
    videoFormats: string[];
    videoMaxSizeMb: number;
    fileFormats: string[];
    fileMaxSizeMb: number;
}

export interface SystemMediaDirectUploadAuthorization {
    uploadUrl: string;
    keyPrefix: string;
    accessKeyId: string;
    policy: string;
    signature: string;
    expiresAt: string;
    ticket: string;
}

export interface SystemMediaFileUpload {
    url: string;
    name: string;
    path: string;
    size: number;
}

export interface SystemMediaFileView {
    id: number;
    originalName: string;
    url: string;
    size: number;
    createdAt: string;
    category: 'image' | 'video' | 'document' | 'archive';
    references: string[];
}

export interface SystemMediaFileQuery extends PageQuery {
    keyword?: string;
    category?: 'image' | 'video' | 'document' | 'archive';
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
    eventType: 'login' | 'logout' | 'sms_code';
    status: 'success' | 'fail';
    message: string | null;
    createdAt: string;
}

export interface LoginLogQuery extends PageQuery {
    username?: string;
    status?: 'success' | 'fail';
    eventType?: 'login' | 'logout' | 'sms_code';
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

/* ---------- 批处理 ---------- */

export interface BatchJobView {
    id: number;
    kind: string;
    sourceName: string;
    status: string;
    phase: string;
    total: number | null;
    selectedCount: number | null;
    processed: number;
    succeeded: number;
    failed: number;
    errorMessage: string | null;
    decidedAt: string | null;
    createdAt: string;
    finishedAt: string | null;
}

export interface BatchTaskDetailView {
    id: number;
    itemNo: number;
    itemName: string;
    stage: string;
    status: string;
    message: string | null;
    sourceLocation: string | null;
    idempotencyKey: string | null;
    displayData: string | null;
    resultType: string | null;
    resultId: string | null;
    createdAt: string;
}
