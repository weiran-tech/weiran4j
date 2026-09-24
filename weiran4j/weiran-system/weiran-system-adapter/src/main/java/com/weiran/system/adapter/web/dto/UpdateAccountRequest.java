package com.weiran.system.adapter.web.dto;

import org.jspecify.annotations.Nullable;

/** 编辑账号请求体，不含密码——改密码走独立的重置密码端点。 */
public record UpdateAccountRequest(
        @Nullable String mobile, @Nullable String email) {}
