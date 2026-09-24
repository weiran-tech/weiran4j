package com.weiran.system.api.rbac;

import java.time.LocalDateTime;
import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 封禁记录视图。
 *
 * <p>封禁是否生效完全由记录是否存在决定，没有独立的启禁用状态字段
 * （见 {@code rbac-ban-management} spec FR-003）。
 *
 * @param id 记录 ID
 * @param accountType 账号类型
 * @param type 封禁类型：{@code ip} / {@code device}
 * @param value 封禁值
 * @param ipStart IP 段起始值（整数形式），非 IP 类型时为 0
 * @param ipEnd IP 段结束值（整数形式），非 IP 类型时为 0
 * @param note 备注
 * @param createdAt 创建时间
 */
public record BanView(
        long id,
        String accountType,
        String type,
        String value,
        long ipStart,
        long ipEnd,
        @Nullable String note,
        LocalDateTime createdAt) {

    public BanView {
        Objects.requireNonNull(accountType, "accountType");
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(value, "value");
        Objects.requireNonNull(createdAt, "createdAt");
    }
}
