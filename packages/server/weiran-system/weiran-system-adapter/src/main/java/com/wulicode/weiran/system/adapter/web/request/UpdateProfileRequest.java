package com.wulicode.weiran.system.adapter.web.request;

import com.wulicode.weiran.system.api.user.UserAvatarView;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 修改个人资料请求。
 *
 * @param nickname 昵称
 * @param avatar 文字头像
 * @param gender 性别
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 32) String nickname,
        @Nullable UserAvatarView avatar,
        @Nullable String gender) {}
