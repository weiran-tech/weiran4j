package com.weiran.system.domain.identity;

import org.jspecify.annotations.Nullable;

/**
 * 提供方确认过的外部身份。
 *
 * @param provider 提供方 id
 * @param externalId 外部身份标识（OIDC {@code sub} / CAS user），绑定只认它
 * @param username 外部用户名（OIDC {@code preferred_username} / CAS user），只用于自动开通时取用户名
 * @param displayName 显示名
 * @param email 已验证的邮箱（OIDC 只在 {@code email_verified=true} 时给出）
 */
public record ExternalIdentity(
        String provider,
        String externalId,
        @Nullable String username,
        @Nullable String displayName,
        @Nullable String email) {}
