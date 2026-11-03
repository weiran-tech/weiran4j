package com.wulicode.weiran.framework.error;

/**
 * 通用错误码表。
 *
 * <p>框架服务号为 10，资源号 00 表示通用错误、01 表示认证与请求安全。
 * 业务模块优先复用通用码并在 {@link BizException} 里给出具体提示语。
 */
public enum CommonErrors implements ErrorCode {

    /** 参数校验失败。 */
    BAD_REQUEST(100001, 400, "参数校验失败"),

    /** 未登录、令牌无效或已失效。 */
    UNAUTHORIZED(100101, 401, "登录已失效，请重新登录"),

    /** 无权限。 */
    FORBIDDEN(100102, 403, "无权限访问"),

    /** CSRF 校验失败：以 Cookie 认证的写请求缺少或带错了 {@code X-CSRF-Token}。 */
    CSRF_REJECTED(100103, 403, "请求校验失败，请刷新页面后重试"),

    /** 资源不存在。 */
    NOT_FOUND(100002, 404, "资源不存在"),

    /** 唯一键冲突。 */
    DUPLICATE_KEY(100003, 409, "数据已存在"),

    /** 业务状态冲突（删除有子节点的数据、删除内置数据、树结构成环等）。 */
    CONFLICT(100004, 409, "当前状态不允许该操作"),

    /** 服务器内部错误。 */
    INTERNAL_ERROR(100005, 500, "服务器内部错误"),

    /** 服务暂不可用（如外部存储未配置）。 */
    SERVICE_UNAVAILABLE(100006, 503, "服务暂不可用");

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
