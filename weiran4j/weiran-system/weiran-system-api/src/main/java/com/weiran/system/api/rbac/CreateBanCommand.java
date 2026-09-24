package com.weiran.system.api.rbac;

import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 新增封禁记录命令。字段对齐 {@code pam_ban} 表既有列，不引入新字段。
 *
 * @param accountType 账号类型
 * @param type 封禁类型：{@code ip} / {@code device}
 * @param value 封禁值
 * @param ipStart IP 段起始值，非 IP 类型传 0
 * @param ipEnd IP 段结束值，非 IP 类型传 0
 * @param note 备注，可为空
 */
public record CreateBanCommand(
        String accountType,
        String type,
        String value,
        long ipStart,
        long ipEnd,
        @Nullable String note) {

    public CreateBanCommand {
        Objects.requireNonNull(accountType, "accountType");
        Objects.requireNonNull(type, "type");
        Objects.requireNonNull(value, "value");
    }
}
