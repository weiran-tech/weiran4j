package com.wulicode.weiran.region.application.autoconfigure;

import com.wulicode.weiran.region.application.region.RegionApplicationService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/** weiran-region 应用层自动配置。 */
@AutoConfiguration
@Import(RegionApplicationService.class)
public class RegionApplicationAutoConfiguration {}
