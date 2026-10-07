package com.weiran.system.api.auth;

import org.jspecify.annotations.Nullable;

/**
 * 管理员手工绑定外部身份。
 *
 * @param provider 提供方 id（必须是已配置的）
 * @param externalId 外部身份标识（OIDC {@code sub} / CAS user）
 * @param displayName 显示名，可空
 */
public record BindIdentityCommand(
        String provider, String externalId, @Nullable String displayName) {}
