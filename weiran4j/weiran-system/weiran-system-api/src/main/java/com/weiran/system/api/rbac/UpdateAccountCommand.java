package com.weiran.system.api.rbac;

import org.jspecify.annotations.Nullable;

/**
 * 编辑账号命令。不含密码——改密码走独立的 {@code resetPassword} 用例。
 *
 * @param mobile 手机号，可为空
 * @param email 邮箱，可为空
 */
public record UpdateAccountCommand(
        @Nullable String mobile, @Nullable String email) {}
