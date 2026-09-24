package com.weiran.system.api.auth;

import java.util.Objects;

/**
 * 登录命令。
 *
 * <p>字段对齐 PHP 版 {@code AuthLoginRequest}：通行证既可以是用户名、手机号也可以是邮箱，
 * {@code guard} 决定登录到前台还是后台账号空间。
 *
 * @param passport 通行证：用户名 / 手机号 / 邮箱
 * @param password 明文密码
 * @param guard 登录空间，取值同 {@code pam_account.type}（{@code user} / {@code backend}）
 * @param deviceId 设备标识，用于单设备登录约束与审计
 * @param loginIp 来源 IP
 */
public record LoginCommand(String passport, String password, String guard, String deviceId, String loginIp) {

    public LoginCommand {
        Objects.requireNonNull(passport, "passport");
        Objects.requireNonNull(password, "password");
        Objects.requireNonNull(guard, "guard");
        Objects.requireNonNull(deviceId, "deviceId");
        Objects.requireNonNull(loginIp, "loginIp");
    }
}
