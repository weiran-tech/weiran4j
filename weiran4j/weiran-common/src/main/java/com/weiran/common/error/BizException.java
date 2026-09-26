package com.weiran.common.error;

import java.io.Serial;

/**
 * 业务异常：携带错误码与面向用户的提示语，由全局异常处理器转换成统一响应。
 *
 * <p>提示语会原样返回给前端，不要把内部细节（SQL、堆栈、令牌）放进去。
 */
public class BizException extends RuntimeException {

    @Serial
    private static final long serialVersionUID = 1L;

    private final transient ErrorCode errorCode;

    /** 使用错误码的默认提示语。 */
    public BizException(final ErrorCode errorCode) {
        this(errorCode, errorCode.message());
    }

    /** 使用自定义提示语。 */
    public BizException(final ErrorCode errorCode, final String message) {
        super(message);
        this.errorCode = errorCode;
    }

    /** 使用默认提示语并保留原因（原因只进日志，不进响应）。 */
    public BizException(final ErrorCode errorCode, final Throwable cause) {
        super(errorCode.message(), cause);
        this.errorCode = errorCode;
    }

    /** 错误码。 */
    public ErrorCode getErrorCode() {
        return this.errorCode;
    }

    /** 快捷方法：资源不存在。 */
    public static BizException notFound(final String message) {
        return new BizException(CommonErrors.NOT_FOUND, message);
    }

    /** 快捷方法：业务状态冲突。 */
    public static BizException conflict(final String message) {
        return new BizException(CommonErrors.CONFLICT, message);
    }

    /** 快捷方法：参数不合法。 */
    public static BizException badRequest(final String message) {
        return new BizException(CommonErrors.BAD_REQUEST, message);
    }

    /** 快捷方法：唯一键冲突。 */
    public static BizException duplicate(final String message) {
        return new BizException(CommonErrors.DUPLICATE_KEY, message);
    }
}
