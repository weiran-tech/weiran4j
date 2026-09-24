package com.weiran.system.api.rbac;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 登录日志视图，复用 {@code pam_account.logined_at}/{@code login_ip}，不对应独立的流水表。
 *
 * @param loginedAt 最近登录时间，从未登录过则为 {@code null}
 * @param loginIp 最近登录来源 IP，从未登录过则为 {@code null}
 */
public record LoginLogView(
        @Nullable LocalDateTime loginedAt, @Nullable String loginIp) {}
