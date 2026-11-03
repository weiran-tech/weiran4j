package com.wulicode.weiran.framework.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标识公开接口，供代码阅读使用；是否需要用户授权由 URL 前缀决定。
 *
 * <p>{@code /api-backend/n/**} 不经过认证拦截器；其余 {@code /api-backend/**} 路径要求登录，即使标记了本注解。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface PublicApi {}
