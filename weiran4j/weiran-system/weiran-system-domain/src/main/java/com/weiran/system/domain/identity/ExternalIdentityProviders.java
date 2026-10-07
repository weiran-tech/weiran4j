package com.weiran.system.domain.identity;

import java.util.List;
import java.util.Optional;

/** 已配置且启用的提供方注册表，以及与外部登录相关的全局设置。 */
public interface ExternalIdentityProviders {

    /** 全部已启用的提供方（按 id 排序）。 */
    List<ExternalIdentityProvider> all();

    /** 按 id 查找已启用的提供方。 */
    Optional<ExternalIdentityProvider> find(String id);

    /** 是否允许普通用户用密码登录（关闭时内置超管仍可登录）。 */
    boolean passwordLoginEnabled();

    /** 对外访问地址（不带结尾斜杠），用于拼回调与登出回跳；不从请求头推断，避免 Host 头注入。 */
    String publicBaseUrl();
}
