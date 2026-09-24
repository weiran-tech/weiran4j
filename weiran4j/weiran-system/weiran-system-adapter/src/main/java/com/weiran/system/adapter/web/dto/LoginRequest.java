package com.weiran.system.adapter.web.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 登录请求体。
 *
 * <p>字段名沿用 PHP 版 {@code AuthLoginRequest}（{@code passport} / {@code password} /
 * {@code guard} / {@code device_id}），让现有前端不用改字段名就能切到新后端。
 *
 * @param passport 通行证：用户名 / 手机号 / 邮箱
 * @param password 明文密码
 * @param guard 登录空间，{@code user} 或 {@code backend}；缺省视为 {@code user}
 * @param deviceId 设备标识，可选
 */
public record LoginRequest(
        @NotBlank(message = "通行证不能为空") @Size(max = 50, message = "通行证长度不能超过 50")
        String passport,

        @NotBlank(message = "密码不能为空") @Size(min = 6, max = 64, message = "密码长度需在 6 到 64 之间")
        String password,

        @Pattern(regexp = "user|backend", message = "登录类型只能是 user 或 backend") @Nullable
        String guard,

        @Nullable String deviceId) {

    /** 默认登录空间：前台用户。 */
    public static final String DEFAULT_GUARD = "user";

    /** 返回生效的登录空间，缺省回落到前台。 */
    public String effectiveGuard() {
        return this.guard == null || this.guard.isBlank() ? LoginRequest.DEFAULT_GUARD : this.guard;
    }

    /** 返回生效的设备标识，缺省为空串而不是 null，避免落库时出现 NULL。 */
    public String effectiveDeviceId() {
        return this.deviceId == null ? "" : this.deviceId;
    }
}
