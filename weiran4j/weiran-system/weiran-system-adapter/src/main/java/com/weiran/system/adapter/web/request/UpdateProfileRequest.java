package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.jspecify.annotations.Nullable;

/**
 * 修改个人资料请求。
 *
 * @param nickname 昵称
 * @param email 邮箱
 * @param phone 手机号
 * @param avatar 头像地址
 * @param gender 性别
 */
public record UpdateProfileRequest(
        @NotBlank @Size(max = 32) String nickname,
        @Nullable @Email @Size(max = 128) String email,
        @Nullable @Size(max = 20) String phone,
        @Nullable @Size(max = 256) String avatar,
        @Nullable String gender) {}
