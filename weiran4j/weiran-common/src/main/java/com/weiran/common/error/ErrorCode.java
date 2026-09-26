package com.weiran.common.error;

/**
 * 错误码契约。
 *
 * <p>{@link #code()} 为五位数字，前三位与 {@link #httpStatus()} 一致（如 40101 → 401），
 * 前端只认 {@code code}，网关与监控可以只看 HTTP 状态码。
 */
public interface ErrorCode {

    /** 五位业务错误码。 */
    int code();

    /** 对应的 HTTP 状态码。 */
    int httpStatus();

    /** 默认提示语（中文，可直接展示给用户）。 */
    String message();
}
