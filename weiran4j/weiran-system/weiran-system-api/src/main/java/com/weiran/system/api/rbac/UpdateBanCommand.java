package com.weiran.system.api.rbac;

import org.jspecify.annotations.Nullable;

/**
 * 编辑封禁记录命令。
 *
 * @param value 封禁值
 * @param ipStart IP 段起始值
 * @param ipEnd IP 段结束值
 * @param note 备注，可为空
 */
public record UpdateBanCommand(
        String value, long ipStart, long ipEnd, @Nullable String note) {}
