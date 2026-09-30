package com.weiran.system.application.autoconfigure;

import com.weiran.system.application.auth.AuthApplicationService;
import com.weiran.system.application.auth.AuthSnapshotCache;
import com.weiran.system.application.auth.AuthorizationResolver;
import com.weiran.system.application.auth.SystemTokenAuthenticator;
import com.weiran.system.application.department.DepartmentApplicationService;
import com.weiran.system.application.loginlog.LoginLogApplicationService;
import com.weiran.system.application.menu.MenuApplicationService;
import com.weiran.system.application.role.RoleApplicationService;
import com.weiran.system.application.user.UserApplicationService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/**
 * weiran-system 应用层自动配置：各用例服务与 {@code TokenAuthenticator} 实现。
 *
 * <p>服务类都只有一个构造器，{@code @Import} 后由容器按构造器注入；事务由 Spring Boot 默认开启的
 * 注解事务驱动，服务类因此不能是 final（CGLIB 代理）。
 */
@AutoConfiguration
@Import({
    AuthSnapshotCache.class,
    AuthorizationResolver.class,
    SystemTokenAuthenticator.class,
    AuthApplicationService.class,
    UserApplicationService.class,
    RoleApplicationService.class,
    MenuApplicationService.class,
    DepartmentApplicationService.class,
    LoginLogApplicationService.class
})
public class SystemApplicationAutoConfiguration {}
