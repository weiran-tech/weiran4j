package com.weiran.common.response;

import com.weiran.common.error.ErrorCode;
import org.jspecify.annotations.Nullable;

/**
 * 统一响应体：{@code {code, message, data}}。
 *
 * <p>成功时 {@code code} 恒为数字 0；失败时为五位错误码、{@code data} 为 null。
 *
 * @param code 0 表示成功，否则为错误码
 * @param message 提示语
 * @param data 业务数据
 * @param <T> 数据类型
 */
public record ApiResponse<T>(
        int code, String message, @Nullable T data) {

    /** 成功码。 */
    public static final int SUCCESS_CODE = 0;

    /** 成功提示语。 */
    public static final String SUCCESS_MESSAGE = "ok";

    /** 成功且带数据。 */
    public static <T> ApiResponse<T> ok(final @Nullable T data) {
        return new ApiResponse<>(ApiResponse.SUCCESS_CODE, ApiResponse.SUCCESS_MESSAGE, data);
    }

    /** 成功且无数据（写操作的常见返回）。 */
    public static ApiResponse<Void> ok() {
        return new ApiResponse<>(ApiResponse.SUCCESS_CODE, ApiResponse.SUCCESS_MESSAGE, null);
    }

    /** 失败，使用自定义提示语。 */
    public static ApiResponse<Void> fail(final ErrorCode errorCode, final String message) {
        return new ApiResponse<>(errorCode.code(), message, null);
    }

    /** 失败，使用错误码的默认提示语。 */
    public static ApiResponse<Void> fail(final ErrorCode errorCode) {
        return ApiResponse.fail(errorCode, errorCode.message());
    }
}
