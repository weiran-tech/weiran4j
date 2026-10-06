package com.weiran.framework.web;

import com.weiran.common.error.ErrorCode;
import org.jspecify.annotations.Nullable;
import org.slf4j.MDC;

/**
 * 失败响应体：{@code {code, message, data: null, requestId}}（契约 §4）。
 *
 * <p>与成功体 {@code ApiResponse} 分开：成功体的形状不变（没有 {@code requestId} 键）；失败体多带请求号，
 * 用户截图报障时就能直接拿到它。只由 {@link GlobalExceptionHandler} 产生，{@link ApiResponseBodyAdvice} 原样放行。
 * 放在框架而不是 {@code weiran-common}：请求号来自框架的 {@link RequestIdFilter}（MDC），common 不该知道这些。
 *
 * @param code 五位错误码
 * @param message 提示语
 * @param data 恒为 {@code null}
 * @param requestId 本次请求的请求号，与响应头 {@code X-Request-Id} 相同
 */
public record ErrorResponse(
        int code, String message, @Nullable Object data, String requestId) {

    /** MDC 里没有请求号时的占位（理论上不会发生：过滤器作用于全部请求）。 */
    public static final String UNKNOWN_REQUEST_ID = "-";

    /** 用当前线程 MDC 里的请求号构造失败体。 */
    public static ErrorResponse of(final ErrorCode errorCode, final String message) {
        final String requestId = MDC.get(RequestIdFilter.MDC_KEY);
        return new ErrorResponse(
                errorCode.code(), message, null, requestId == null ? ErrorResponse.UNKNOWN_REQUEST_ID : requestId);
    }
}
