package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/** 本人修改用户名。 */
public record UpdateOwnUsernameRequest(
        @NotBlank @Size(max = 32) String username) {}
