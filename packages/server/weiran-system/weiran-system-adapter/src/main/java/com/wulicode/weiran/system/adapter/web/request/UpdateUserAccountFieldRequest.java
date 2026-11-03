package com.wulicode.weiran.system.adapter.web.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** 管理员单字段设置用户账号信息。 */
public record UpdateUserAccountFieldRequest(
        @NotBlank String field, @NotNull @Size(max = 128) String value) {}
