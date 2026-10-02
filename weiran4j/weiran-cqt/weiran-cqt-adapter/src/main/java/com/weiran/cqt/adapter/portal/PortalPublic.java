package com.weiran.cqt.adapter.portal;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标在前台 Controller 类或方法上：无需登录即可访问。
 *
 * <p>带了有效令牌时仍会解析出当前账号，方法内可以用 {@link PortalAccount#current()} 读取。
 * 与框架的 {@code @PublicApi} 分开：那个属于后台 {@code /api/**} 的拦截器。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface PortalPublic {}
