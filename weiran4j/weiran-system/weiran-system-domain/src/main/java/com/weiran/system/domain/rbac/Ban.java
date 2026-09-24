package com.weiran.system.domain.rbac;

import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/**
 * 封禁记录聚合根。对应 {@code pam_ban} 表。
 *
 * <p>封禁是否生效完全由记录是否存在决定——本类型没有独立的启禁用状态字段，
 * 删除即解封，不建模"禁用中的封禁记录"这种中间态。
 */
@Getter
@Builder(toBuilder = true)
public final class Ban {

    private final long id;

    /** 该封禁适用的账号类型，与 {@code pam_account.type} 同域。 */
    private final String accountType;

    /** 封禁类型：{@code ip} / {@code device}。 */
    private final String type;

    private final String value;

    /** IP 段起始值（整数形式），非 IP 类型时为 0。 */
    private final long ipStart;

    /** IP 段结束值（整数形式），非 IP 类型时为 0。 */
    private final long ipEnd;

    private final @Nullable String note;

    private final LocalDateTime createdAt;

    /** 更新可变字段，返回更新后的新实例。 */
    public Ban update(
            final String newValue, final long newIpStart, final long newIpEnd, final @Nullable String newNote) {
        return this.toBuilder()
                .value(newValue)
                .ipStart(newIpStart)
                .ipEnd(newIpEnd)
                .note(newNote)
                .build();
    }
}
