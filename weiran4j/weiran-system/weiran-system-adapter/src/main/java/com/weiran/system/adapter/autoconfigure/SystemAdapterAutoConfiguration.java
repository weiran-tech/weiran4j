package com.weiran.system.adapter.autoconfigure;

import com.kjs.wuli3.core.time.ClockProvider;
import com.kjs.wuli3.web.auth.AuthContextResolver;
import com.kjs.wuli3.web.autoconfigure.WebContextAutoConfiguration;
import com.kjs.wuli3.web.autoconfigure.WebErrorAutoConfiguration;
import com.kjs.wuli3.web.error.WebErrorStatusResolver;
import com.kjs.wuli3.web.internal.handler.DefaultWebErrorStatusResolver;
import com.weiran.system.adapter.auth.PrincipalHolder;
import com.weiran.system.adapter.auth.PrincipalHolderCleanupFilter;
import com.weiran.system.adapter.auth.WeiranAuthContextResolver;
import com.weiran.system.adapter.web.AuthController;
import com.weiran.system.adapter.web.BanController;
import com.weiran.system.adapter.web.PamController;
import com.weiran.system.adapter.web.PermissionController;
import com.weiran.system.adapter.web.RoleController;
import com.weiran.system.adapter.web.WeiranWebErrorStatusResolver;
import com.weiran.system.api.auth.AuthService;
import com.weiran.system.api.rbac.BanService;
import com.weiran.system.api.rbac.PamService;
import com.weiran.system.api.rbac.RoleService;
import com.weiran.system.application.auth.AuthApplicationService;
import com.weiran.system.application.rbac.BanApplicationService;
import com.weiran.system.application.rbac.PamApplicationService;
import com.weiran.system.application.rbac.RoleApplicationService;
import com.weiran.system.domain.port.AccessTokenIssuer;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.domain.port.BanRepository;
import com.weiran.system.domain.port.PasswordHasher;
import com.weiran.system.domain.port.PasswordStampFactory;
import com.weiran.system.domain.port.RbacRepository;
import com.weiran.system.domain.port.RoleRepository;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * weiran-system 适配层装配。
 *
 * <p>Controller 用 {@code @Import} 显式登记而不是靠组件扫描：本模块是被应用依赖的库，
 * 依赖组件扫描就意味着应用必须知道并配置本模块的包名，那是把装配责任推给了调用方。
 *
 * <p>必须排在 wuli3 的 {@code WebErrorAutoConfiguration} 与 {@code WebContextAutoConfiguration}
 * **之前**：底座那两处的 {@code AuthContextResolver} 与 {@code WebErrorStatusResolver} 都带
 * {@code @ConditionalOnMissingBean}，顺序反了条件就会先判定为「缺失」并注册默认实现，
 * 结果是容器里出现两个同类型 Bean 而启动失败——错误信息只说「found 2」，
 * 完全看不出根因是自动配置顺序。
 */
@AutoConfiguration(before = {WebErrorAutoConfiguration.class, WebContextAutoConfiguration.class})
@Import({
    AuthController.class,
    RoleController.class,
    PamController.class,
    BanController.class,
    PermissionController.class
})
public class SystemAdapterAutoConfiguration {

    @Bean
    @ConditionalOnMissingBean
    public PrincipalHolder weiranPrincipalHolder() {
        return new PrincipalHolder();
    }

    @Bean
    @ConditionalOnMissingBean
    public AuthApplicationService weiranAuthApplicationService(
            final AccountRepository accountRepository,
            final RbacRepository rbacRepository,
            final PasswordHasher passwordHasher,
            final PasswordStampFactory passwordStampFactory,
            final AccessTokenIssuer accessTokenIssuer,
            final ClockProvider clockProvider) {
        return new AuthApplicationService(
                accountRepository,
                rbacRepository,
                passwordHasher,
                passwordStampFactory,
                accessTokenIssuer,
                clockProvider);
    }

    /** 对外契约 Bean 指向同一个应用服务实例，避免容器里出现两份状态。 */
    @Bean
    @ConditionalOnMissingBean
    public AuthService weiranAuthService(final AuthApplicationService authApplicationService) {
        return authApplicationService;
    }

    /** 覆盖 wuli3 默认的可信头认证，改为 Bearer 令牌验签。 */
    @Bean
    public AuthContextResolver weiranAuthContextResolver(
            final AuthApplicationService authApplicationService, final PrincipalHolder principalHolder) {
        return new WeiranAuthContextResolver(authApplicationService, principalHolder);
    }

    /** 覆盖默认状态映射，让认证错误返回 401 / 403 而不是统一 400。 */
    @Bean
    public WebErrorStatusResolver weiranWebErrorStatusResolver() {
        return new WeiranWebErrorStatusResolver(new DefaultWebErrorStatusResolver());
    }

    @Bean
    public PrincipalHolderCleanupFilter weiranPrincipalHolderCleanupFilter(final PrincipalHolder principalHolder) {
        return new PrincipalHolderCleanupFilter(principalHolder);
    }

    @Bean
    @ConditionalOnMissingBean
    public RoleService weiranRoleService(final RoleRepository roleRepository) {
        return new RoleApplicationService(roleRepository);
    }

    @Bean
    @ConditionalOnMissingBean
    public PamService weiranPamService(
            final AccountRepository accountRepository,
            final PasswordHasher passwordHasher,
            final ClockProvider clockProvider) {
        return new PamApplicationService(accountRepository, passwordHasher, clockProvider);
    }

    @Bean
    @ConditionalOnMissingBean
    public BanService weiranBanService(final BanRepository banRepository, final ClockProvider clockProvider) {
        return new BanApplicationService(banRepository, clockProvider);
    }
}
