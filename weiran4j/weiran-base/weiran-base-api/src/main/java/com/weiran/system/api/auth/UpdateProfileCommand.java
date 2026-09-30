package com.weiran.system.api.auth;

import org.jspecify.annotations.Nullable;

/**
 * 修改个人资料。
 *
 * @param nickname 昵称
 * @param email 邮箱
 * @param phone 手机号
 * @param avatar 头像地址
 * @param gender 性别，空表示 unknown
 */
public record UpdateProfileCommand(
        String nickname,
        @Nullable String email,
        @Nullable String phone,
        @Nullable String avatar,
        @Nullable String gender) {}
