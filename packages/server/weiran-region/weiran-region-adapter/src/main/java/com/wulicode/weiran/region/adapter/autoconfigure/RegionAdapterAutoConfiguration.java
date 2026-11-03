package com.wulicode.weiran.region.adapter.autoconfigure;

import com.wulicode.weiran.region.adapter.web.PublicRegionController;
import com.wulicode.weiran.region.adapter.web.RegionController;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Import;

/** weiran-region HTTP 适配层自动配置。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({RegionController.class, PublicRegionController.class})
public class RegionAdapterAutoConfiguration {}
