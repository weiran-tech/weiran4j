package com.weiran.cqt.adapter.portal;

import org.jspecify.annotations.Nullable;

/**
 * 前台接口响应体 {@code {code, message, data}}：成功 {@code code} 为 200，失败为错误码前三位（如 401、404）。
 *
 * <p>uniapp 按 {@code code == 200} 判成功、{@code code == 401} 判未登录，HTTP 状态恒为 200。
 *
 * @param code 200 表示成功
 * @param message 提示语
 * @param data 业务数据
 * @param <T> 数据类型
 */
public record PortalResult<T>(
        int code, String message, @Nullable T data) {

    /** 成功码。 */
    public static final int SUCCESS_CODE = 200;

    /** 成功提示语。 */
    public static final String SUCCESS_MESSAGE = "成功";

    /** 成功且带数据。 */
    public static <T> PortalResult<T> ok(final @Nullable T data) {
        return new PortalResult<>(PortalResult.SUCCESS_CODE, PortalResult.SUCCESS_MESSAGE, data);
    }

    /** 失败。 */
    public static PortalResult<Void> fail(final int code, final String message) {
        return new PortalResult<>(code, message, null);
    }
}
