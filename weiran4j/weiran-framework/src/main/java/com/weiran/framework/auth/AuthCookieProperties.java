package com.weiran.framework.auth;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.boot.context.properties.bind.DefaultValue;

/**
 * {@code weiran.auth.cookie.*}：认证 Cookie 的部署相关属性。
 *
 * @param secure 是否带 {@code Secure}。默认 {@code true}；本地 {@code http://localhost} 开发需设为 {@code false}
 *     （Safari 不接受 http 下的 Secure Cookie），由环境变量 {@code WEIRAN_COOKIE_SECURE} 覆盖
 */
@ConfigurationProperties("weiran.auth.cookie")
public record AuthCookieProperties(@DefaultValue("true") boolean secure) {}
