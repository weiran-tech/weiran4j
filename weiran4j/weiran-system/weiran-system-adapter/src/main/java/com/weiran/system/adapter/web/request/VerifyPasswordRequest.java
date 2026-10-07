package com.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * 校验当前用户密码请求（锁屏解锁）。
 *
 * @param password 密码
 */
public record VerifyPasswordRequest(
        @NotBlank @Size(max = 64) String password) {}
