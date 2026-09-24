package com.weiran.system.api.rbac;

import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 账号列表/详情视图。
 *
 * <p>不包含密码哈希或盐值——管理端不需要、也不应该看到这些字段（CP-9）。
 *
 * @param id 账号 ID
 * @param username 用户名
 * @param mobile 手机号，可能为空
 * @param email 邮箱，可能为空
 * @param accountType 账号类型
 * @param enabled 是否启用
 */
public record AccountView(
        long id,
        String username,
        @Nullable String mobile,
        @Nullable String email,
        String accountType,
        boolean enabled) {

    public AccountView {
        Objects.requireNonNull(username, "username");
        Objects.requireNonNull(accountType, "accountType");
    }
}
