package com.weiran.framework.auth;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 声明访问接口所需的权限码。方法上的声明优先于类上的声明。
 *
 * <p>超级管理员（角色 {@link LoginUser#SUPER_ADMIN_ROLE}）直接放行。未登录返回 401，权限不足返回 403。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface RequiresPermission {

    /** 权限码，如 {@code system:user:list}。 */
    String[] value();

    /** 多个权限码的组合方式，默认任一即可。 */
    Logical logical() default Logical.ANY;
}
