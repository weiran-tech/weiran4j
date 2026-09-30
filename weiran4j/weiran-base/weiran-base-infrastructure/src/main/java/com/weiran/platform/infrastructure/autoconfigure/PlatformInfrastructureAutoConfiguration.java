package com.weiran.platform.infrastructure.autoconfigure;

import com.weiran.platform.infrastructure.json.JacksonJsonSyntax;
import com.weiran.platform.infrastructure.persistence.MybatisConfigRepository;
import com.weiran.platform.infrastructure.persistence.MybatisDictRepository;
import com.weiran.platform.infrastructure.persistence.MybatisOperationLogRepository;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/**
 * weiran-platform 基础设施自动配置：Mapper 扫描、仓储实现与 JSON 校验。
 *
 * <p>Flyway 脚本在 {@code classpath:db/migration/platform/} 下，由应用统一的 locations 递归发现。
 */
@AutoConfiguration
@MapperScan("com.weiran.platform.infrastructure.persistence.mapper")
@Import({
    MybatisDictRepository.class,
    MybatisConfigRepository.class,
    MybatisOperationLogRepository.class,
    JacksonJsonSyntax.class
})
public class PlatformInfrastructureAutoConfiguration {}
