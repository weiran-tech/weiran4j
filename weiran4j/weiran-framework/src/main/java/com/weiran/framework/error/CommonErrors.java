package com.weiran.framework.error;

/**
 * 通用错误码表。
 *
 * <p>业务模块优先复用这里的码并在 {@link BizException} 里给出具体提示语，
 * 只有前端需要按码分支处理的场景才值得新增码。
 */
public enum CommonErrors implements ErrorCode {

    /** 参数校验失败。 */
    BAD_REQUEST(40000, 400, "参数校验失败"),

    /** 未登录、令牌无效或已失效。 */
    UNAUTHORIZED(40100, 401, "登录已失效，请重新登录"),

    /** 用户名或密码错误（用户名不存在也用这个码，防止枚举账号）。 */
    BAD_CREDENTIALS(40101, 401, "用户名或密码错误"),

    /** 外部身份校验失败：票据 / 授权码无效、state 不符、id_token 验签失败、流程过期（D-015）。 */
    EXTERNAL_AUTH_FAILED(40102, 401, "外部身份校验失败，请重新登录"),

    /** 无权限。 */
    FORBIDDEN(40300, 403, "无权限访问"),

    /** 账号已禁用。 */
    ACCOUNT_DISABLED(40301, 403, "账号已禁用"),

    /** CSRF 校验失败：以 Cookie 认证的写请求缺少或带错了 {@code X-CSRF-Token}。 */
    CSRF_REJECTED(40302, 403, "请求校验失败，请刷新页面后重试"),

    /** 外部身份未绑定本地账号且不允许自动开通（D-015：只对已通过 IdP 认证的人可见，不泄露本地账号是否存在）。 */
    ACCOUNT_NOT_PROVISIONED(40303, 403, "账号未开通，请联系管理员"),

    /** 密码登录已关闭，只能用外部身份登录（内置超管除外）。 */
    PASSWORD_LOGIN_DISABLED(40304, 403, "密码登录已关闭，请使用统一身份登录"),

    /** 资源不存在。 */
    NOT_FOUND(40400, 404, "资源不存在"),

    /** 唯一键冲突。 */
    DUPLICATE_KEY(40900, 409, "数据已存在"),

    /** 业务状态冲突（删除有子节点的数据、删除内置数据、树结构成环等）。 */
    CONFLICT(40901, 409, "当前状态不允许该操作"),

    /** 服务器内部错误。 */
    INTERNAL_ERROR(50000, 500, "服务器内部错误");

    private final int code;

    private final int httpStatus;

    private final String message;

    CommonErrors(final int code, final int httpStatus, final String message) {
        this.code = code;
        this.httpStatus = httpStatus;
        this.message = message;
    }

    @Override
    public int code() {
        return this.code;
    }

    @Override
    public int httpStatus() {
        return this.httpStatus;
    }

    @Override
    public String message() {
        return this.message;
    }
}
