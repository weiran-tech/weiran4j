package com.wulicode.weiran.system.api.user;

import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 新增用户。
 *
 * @param username 用户名
 * @param nickname 昵称
 * @param password 初始密码
 * @param phone 手机号
 * @param gender 性别，空为 unknown
 * @param status 状态，空为 enabled
 * @param roleIds 角色 ID
 */
public record CreateUserCommand(
        String username,
        String nickname,
        String password,
        @Nullable String phone,
        @Nullable String gender,
        @Nullable String status,
        List<Long> roleIds) {}
