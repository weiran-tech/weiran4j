package com.weiran.common.error;

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

    /** 无权限。 */
    FORBIDDEN(40300, 403, "无权限访问"),

    /** 账号已禁用。 */
    ACCOUNT_DISABLED(40301, 403, "账号已禁用"),

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
