package com.weiran.system.api.rbac;

import java.util.Objects;
import org.jspecify.annotations.Nullable;

/**
 * 新增账号命令。
 *
 * <p>{@link #password} 是明文，实现层必须通过 {@code PasswordHasher.hash()} 产出 BCrypt
 * 哈希后落库，不得以任何形式落盘明文或使用历史算法生成新哈希（CP-8）。
 *
 * @param username 用户名
 * @param password 明文密码
 * @param mobile 手机号，可为空
 * @param email 邮箱，可为空
 * @param accountType 账号类型
 */
public record CreateAccountCommand(
        String username,
        String password,
        @Nullable String mobile,
        @Nullable String email,
        String accountType) {

    public CreateAccountCommand {
        Objects.requireNonNull(username, "username");
        Objects.requireNonNull(password, "password");
        Objects.requireNonNull(accountType, "accountType");
    }
}
