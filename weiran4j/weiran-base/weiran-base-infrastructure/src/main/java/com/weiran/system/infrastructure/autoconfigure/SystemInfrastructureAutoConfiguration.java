package com.weiran.system.infrastructure.autoconfigure;

import com.weiran.system.domain.auth.TokenCodec;
import com.weiran.system.domain.user.PasswordHasher;
import com.weiran.system.infrastructure.persistence.MybatisDepartmentRepository;
import com.weiran.system.infrastructure.persistence.MybatisLoginLogRepository;
import com.weiran.system.infrastructure.persistence.MybatisMenuRepository;
import com.weiran.system.infrastructure.persistence.MybatisRoleRepository;
import com.weiran.system.infrastructure.persistence.MybatisUserRepository;
import com.weiran.system.infrastructure.security.BCryptPasswordHasher;
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
 * weiran-system 基础设施自动配置：Mapper 扫描、仓储实现、JWT 与 BCrypt。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/system/} 下，由应用统一的
 * {@code spring.flyway.locations=classpath:db/migration} 递归发现，不需要在这里登记。
 */
@AutoConfiguration
@MapperScan("com.weiran.system.infrastructure.persistence.mapper")
@EnableConfigurationProperties(SystemSecurityProperties.class)
@Import({
    MybatisUserRepository.class,
    MybatisRoleRepository.class,
    MybatisMenuRepository.class,
    MybatisDepartmentRepository.class,
    MybatisLoginLogRepository.class
})
public class SystemInfrastructureAutoConfiguration {

    /** JWT 编解码；密钥不合法时启动失败。 */
    @Bean
    @ConditionalOnMissingBean
    public TokenCodec tokenCodec(final SystemSecurityProperties properties, final Clock clock) {
        return new JwtTokenCodec(properties.jwt().secret(), properties.jwt().ttl(), clock);
    }

    /** BCrypt 密码哈希。 */
    @Bean
    @ConditionalOnMissingBean
    public PasswordHasher passwordHasher(final SystemSecurityProperties properties) {
        return new BCryptPasswordHasher(properties.bcryptStrength());
    }
}
