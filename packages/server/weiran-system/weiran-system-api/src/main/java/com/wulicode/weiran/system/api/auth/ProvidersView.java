package com.wulicode.weiran.system.api.auth;

import java.util.List;

/**
 * 登录页需要的认证方式。
 *
 * @param passwordLoginEnabled 是否允许普通用户用密码登录
 * @param phoneLoginEnabled 是否开放手机号验证码登录
 * @param providers 已启用的外部身份提供方
 */
public record ProvidersView(boolean passwordLoginEnabled, boolean phoneLoginEnabled, List<ProviderView> providers) {

    /** 兼容只提供外部身份与密码登录状态的调用方。 */
    public ProvidersView(final boolean passwordLoginEnabled, final List<ProviderView> providers) {
        this(passwordLoginEnabled, false, providers);
    }
}
