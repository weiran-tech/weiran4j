package com.wulicode.weiran.system.api.auth;

import com.wulicode.weiran.system.api.user.UserAvatarView;
import org.jspecify.annotations.Nullable;

/**
 * 修改个人资料。
 *
 * @param nickname 昵称
 * @param avatar 文字头像与背景色
 * @param gender 性别，空表示 unknown
 */
public record UpdateProfileCommand(
        String nickname,
        @Nullable UserAvatarView avatar,
        @Nullable String gender) {}
