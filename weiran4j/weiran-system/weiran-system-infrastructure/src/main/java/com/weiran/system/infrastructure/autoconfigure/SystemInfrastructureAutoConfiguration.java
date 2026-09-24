package com.weiran.system.infrastructure.autoconfigure;

import com.baomidou.mybatisplus.autoconfigure.MybatisPlusAutoConfiguration;
import com.kjs.wuli3.core.time.ClockProvider;
import com.weiran.system.domain.port.AccessTokenIssuer;
import com.weiran.system.domain.port.AccountRepository;
import com.weiran.system.domain.port.BanRepository;
import com.weiran.system.domain.port.PasswordHasher;
import com.weiran.system.domain.port.PasswordStampFactory;
import com.weiran.system.domain.port.RbacRepository;
import com.weiran.system.domain.port.RoleRepository;
import com.weiran.system.infrastructure.persistence.MyBatisAccountRepository;
import com.weiran.system.infrastructure.persistence.MyBatisBanRepository;
import com.weiran.system.infrastructure.persistence.MyBatisRbacRepository;
import com.weiran.system.infrastructure.persistence.MyBatisRoleRepository;
import com.weiran.system.infrastructure.persistence.mapper.PamAccountMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamBanMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamPermissionMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamPermissionRoleMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamRoleAccountMapper;
import com.weiran.system.infrastructure.persistence.mapper.PamRoleMapper;
import com.weiran.system.infrastructure.persistence.mapper.RbacMapper;
import com.weiran.system.infrastructure.security.BCryptWithLegacyPasswordHasher;
import com.weiran.system.infrastructure.security.JwtAccessTokenIssuer;
import com.weiran.system.infrastructure.security.JwtProperties;
import com.weiran.system.infrastructure.security.Sha256PasswordStampFactory;
import java.time.ZoneId;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;

/**
 * weiran-system 基础设施装配。
 *
 * <p>每个端口实现都带 {@link ConditionalOnMissingBean}：业务方要换实现只需自己声明一个同类型 Bean，
 * 不必排除整个自动配置。
 *
 * <p>Mapper 扫描范围由本模块自己声明，而不是让应用去写 {@code @MapperScan}：
 * MyBatis 默认从 {@code @SpringBootApplication} 所在包往下扫，而本模块的包
 * （{@code com.weiran.system.infrastructure}）不在应用包（{@code com.weiran.app}）之下，
 * 靠默认扫描永远扫不到。把它写在这里，新增模块时应用侧不需要任何改动。
 */
@AutoConfiguration(after = MybatisPlusAutoConfiguration.class)
@MapperScan("com.weiran.system.infrastructure.persistence.mapper")
@EnableConfigurationProperties({SystemInfrastructureProperties.class, JwtProperties.class})
public class SystemInfrastructureAutoConfiguration {

    /**
     * 系统时钟。
     *
     * <p>抽成 Bean 是为了让用例的时间相关分支（限期封禁、令牌过期）在测试里可以被固定；
     * 时区取 JVM 默认，需要钉死时区的部署用 {@code TZ} 环境变量或自己声明该 Bean。
     */
    @Bean
    @ConditionalOnMissingBean
    public ClockProvider weiranClockProvider() {
        return ClockProvider.system(ZoneId.systemDefault());
    }

    @Bean
    @ConditionalOnMissingBean
    public PasswordHasher weiranPasswordHasher(final SystemInfrastructureProperties properties) {
        return new BCryptWithLegacyPasswordHasher(properties.getBcryptStrength());
    }

    @Bean
    @ConditionalOnMissingBean
    public PasswordStampFactory weiranPasswordStampFactory() {
        return new Sha256PasswordStampFactory();
    }

    @Bean
    @ConditionalOnMissingBean
    public AccessTokenIssuer weiranAccessTokenIssuer(
            final JwtProperties jwtProperties, final ClockProvider clockProvider) {
        return new JwtAccessTokenIssuer(jwtProperties, clockProvider);
    }

    @Bean
    @ConditionalOnMissingBean
    public AccountRepository weiranAccountRepository(final PamAccountMapper accountMapper) {
        return new MyBatisAccountRepository(accountMapper);
    }

    @Bean
    @ConditionalOnMissingBean
    public RbacRepository weiranRbacRepository(final RbacMapper rbacMapper) {
        return new MyBatisRbacRepository(rbacMapper);
    }

    @Bean
    @ConditionalOnMissingBean
    public RoleRepository weiranRoleRepository(
            final PamRoleMapper roleMapper,
            final PamPermissionMapper permissionMapper,
            final PamPermissionRoleMapper permissionRoleMapper,
            final PamRoleAccountMapper roleAccountMapper) {
        return new MyBatisRoleRepository(roleMapper, permissionMapper, permissionRoleMapper, roleAccountMapper);
    }

    @Bean
    @ConditionalOnMissingBean
    public BanRepository weiranBanRepository(final PamBanMapper banMapper) {
        return new MyBatisBanRepository(banMapper);
    }
}
