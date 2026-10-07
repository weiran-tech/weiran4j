package com.weiran.system.domain.identity;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 外部身份与本地用户的绑定。{@code (provider, externalId)} 全局唯一。
 *
 * @param id ID，未保存时为空
 * @param userId 本地用户 ID
 * @param provider 提供方 id
 * @param externalId 外部身份标识
 * @param displayName 绑定时的外部显示名
 * @param createdAt 绑定时间
 * @param createdBy 绑定操作人
 */
public record UserIdentity(
        @Nullable Long id,
        long userId,
        String provider,
        String externalId,
        @Nullable String displayName,
        @Nullable LocalDateTime createdAt,
        @Nullable Long createdBy) {

    /** 已保存绑定的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("绑定尚未保存");
        }
        return this.id;
    }
}
