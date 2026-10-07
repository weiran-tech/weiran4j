package com.weiran.system.api.auth;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 外部身份绑定。
 *
 * @param id 绑定 ID
 * @param provider 提供方 id
 * @param providerName 提供方名称（提供方已从配置中移除时为其 id）
 * @param externalId 外部身份标识
 * @param displayName 绑定时的外部显示名
 * @param createdAt 绑定时间
 */
public record UserIdentityView(
        long id,
        String provider,
        String providerName,
        String externalId,
        @Nullable String displayName,
        @Nullable LocalDateTime createdAt) {}
