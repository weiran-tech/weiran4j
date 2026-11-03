package com.wulicode.weiran.system.api.auth;

import com.wulicode.weiran.system.api.user.UserAvatarView;
import java.util.List;
import org.jspecify.annotations.Nullable;

/**
 * 当前登录用户。
 *
 * @param id 用户 ID
 * @param username 用户名
 * @param nickname 昵称
 * @param phone 手机号
 * @param avatar 文字头像与背景色
 * @param gender 性别
 * @param roles 生效的角色编码
 * @param permissions 权限码；超级管理员为 {@code ["*"]}
 * @param hasPassword 是否有本地密码（外部身份自动开通的用户没有，D-015）
 */
public record CurrentUserView(
        long id,
        String username,
        String nickname,
        @Nullable String phone,
        @Nullable UserAvatarView avatar,
        String gender,
        List<String> roles,
        List<String> permissions,
        boolean hasPassword) {}
