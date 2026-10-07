package com.weiran.system.infrastructure.autoconfigure;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.auth.TokenIssuerReader;
import com.weiran.system.domain.auth.TokenVerifier;
import com.weiran.system.domain.identity.ExternalIdentityProviders;
import com.weiran.system.domain.identity.SsoStateSigner;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.infrastructure.identity.AuthProvidersProperties;
import com.weiran.system.infrastructure.identity.ConfiguredExternalIdentityProviders;
import com.weiran.system.infrastructure.identity.HmacSsoStateSigner;
import com.weiran.system.infrastructure.persistence.MybatisDepartmentRepository;
import com.weiran.system.infrastructure.persistence.MybatisLoginLogRepository;
import com.weiran.system.infrastructure.persistence.MybatisMenuRepository;
import com.weiran.system.infrastructure.persistence.MybatisRoleRepository;
import com.weiran.system.infrastructure.persistence.MybatisUserIdentityRepository;
import com.weiran.system.infrastructure.persistence.MybatisUserRepository;
import com.weiran.system.infrastructure.security.AuthJwtProperties;
import com.weiran.system.infrastructure.security.BCryptPasswordHasher;
import com.weiran.system.infrastructure.security.JwtIssuerReader;
import com.weiran.system.infrastructure.security.JwtTokenCodec;
import com.weiran.system.infrastructure.security.SystemSecurityProperties;
import java.time.Clock;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * weiran-system 基础设施自动配置：Mapper 扫描、仓储实现、本地 JWT（签发 / 校验 / 读签发方）与 BCrypt。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/system/} 下，由应用统一的
 * {@code spring.flyway.locations=classpath:db/migration} 递归发现，不需要在这里登记。
 */
@AutoConfiguration
@MapperScan("com.weiran.system.infrastructure.persistence.mapper")
@EnableConfigurationProperties({SystemSecurityProperties.class, AuthJwtProperties.class, AuthProvidersProperties.class})
@Import({
    MybatisUserRepository.class,
    MybatisRoleRepository.class,
    MybatisMenuRepository.class,
    MybatisDepartmentRepository.class,
    MybatisLoginLogRepository.class,
    MybatisUserIdentityRepository.class
})
public class SystemInfrastructureAutoConfiguration {

    /**
     * 本地 JWT：同一个 Bean 既是签发端口 {@link TokenCodec}，也是本地签发方的 {@link TokenVerifier}
     * （只注册一次，免得分发器按类型收集时拿到同一实例的多个别名）。密钥不合法时启动失败。
     */
    @Bean
    @ConditionalOnMissingBean(TokenCodec.class)
    public JwtTokenCodec jwtTokenCodec(final AuthJwtProperties properties, final Clock clock) {
        return new JwtTokenCodec(properties, clock);
    }

    /** 读令牌签发方（不验签）。 */
    @Bean
    @ConditionalOnMissingBean
    public TokenIssuerReader tokenIssuerReader(final ObjectMapper objectMapper) {
        return new JwtIssuerReader(objectMapper);
    }

    /** 外部身份提供方注册表（配置不完整时启动失败）。 */
    @Bean
    @ConditionalOnMissingBean
    public ExternalIdentityProviders externalIdentityProviders(
            final AuthProvidersProperties properties, final ObjectMapper objectMapper, final Clock clock) {
        return new ConfiguredExternalIdentityProviders(properties, objectMapper, clock);
    }

    /** 外部登录流程状态签名（密钥由 JWT 密钥派生）。 */
    @Bean
    @ConditionalOnMissingBean
    public SsoStateSigner ssoStateSigner(final AuthJwtProperties properties, final ObjectMapper objectMapper) {
        return new HmacSsoStateSigner(properties.secret(), objectMapper);
    }

    /** BCrypt 密码哈希。 */
    @Bean
    @ConditionalOnMissingBean
    public PasswordHasher passwordHasher(final SystemSecurityProperties properties) {
        return new BCryptPasswordHasher(properties.bcryptStrength());
    }
}
