package com.wulicode.weiran.framework.error;

/**
 * 错误码契约。
 *
 * <p>{@link #code()} 为六位数字，按「服务两位、资源两位、错误两位」编码。
 * {@link #httpStatus()} 独立决定 HTTP 状态，前端按 {@code code} 处理具体错误。
 */
public interface ErrorCode {

    /** 六位业务错误码。 */
    int code();

    /** 对应的 HTTP 状态码。 */
    int httpStatus();

    /** 默认提示语（中文，可直接展示给用户）。 */
    String message();
}
