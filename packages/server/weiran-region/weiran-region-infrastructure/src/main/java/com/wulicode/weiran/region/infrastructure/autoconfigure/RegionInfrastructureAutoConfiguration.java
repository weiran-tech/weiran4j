package com.wulicode.weiran.region.infrastructure.autoconfigure;

import com.wulicode.weiran.region.infrastructure.persistence.MybatisRegionRepository;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/** weiran-region 基础设施自动配置。 */
@AutoConfiguration
@MapperScan("com.wulicode.weiran.region.infrastructure.persistence.mapper")
@Import(MybatisRegionRepository.class)
public class RegionInfrastructureAutoConfiguration {}
