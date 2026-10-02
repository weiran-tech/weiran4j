package com.weiran.cqt.infrastructure.autoconfigure;

import com.weiran.cqt.domain.portal.PortalTokenCodec;
import com.weiran.cqt.infrastructure.persistence.MybatisSettingRepository;
import com.weiran.cqt.infrastructure.security.JjwtPortalTokenCodec;
import java.time.Clock;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;

/**
 * weiran-cqt 基础设施自动配置：Mapper 扫描、仓储实现与前台令牌编解码。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/cqt/} 下，由应用统一的 locations 递归发现。
 */
@AutoConfiguration
@MapperScan("com.weiran.cqt.infrastructure.persistence.mapper")
@EnableConfigurationProperties(CqtJwtProperties.class)
@Import(MybatisSettingRepository.class)
public class CqtInfrastructureAutoConfiguration {

    /** 前台令牌编解码；密钥不合法时启动失败。 */
    @Bean
    @ConditionalOnMissingBean
    public PortalTokenCodec portalTokenCodec(final CqtJwtProperties properties, final Clock clock) {
        return new JjwtPortalTokenCodec(properties.secret(), properties.ttl(), clock);
    }
}
