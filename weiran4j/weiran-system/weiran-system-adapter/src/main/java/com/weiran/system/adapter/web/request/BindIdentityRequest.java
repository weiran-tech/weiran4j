package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 管理员手工绑定外部身份。
 *
 * @param provider 提供方 id
 * @param externalId 外部身份标识（OIDC sub / CAS user）
 * @param displayName 显示名，可空
 */
public record BindIdentityRequest(
        @NotBlank @Size(max = 32) String provider,
        @NotBlank @Size(max = 191) String externalId,
        @Size(max = 64) @Nullable String displayName) {}
