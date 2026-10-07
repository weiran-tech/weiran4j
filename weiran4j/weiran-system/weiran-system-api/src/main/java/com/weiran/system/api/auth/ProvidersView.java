package com.weiran.system.api.auth;

import java.util.List;

/**
 * 登录页需要的认证方式。
 *
 * @param passwordLoginEnabled 是否允许普通用户用密码登录
 * @param providers 已启用的外部身份提供方
 */
public record ProvidersView(boolean passwordLoginEnabled, List<ProviderView> providers) {}
