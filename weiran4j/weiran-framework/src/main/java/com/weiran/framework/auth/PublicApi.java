package com.weiran.framework.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标在 Controller 类或方法上：无需登录即可访问。
 *
 * <p>带了有效令牌时仍会解析出当前用户，方法内可以用 {@link CurrentUser#get()} 读取。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface PublicApi {}
