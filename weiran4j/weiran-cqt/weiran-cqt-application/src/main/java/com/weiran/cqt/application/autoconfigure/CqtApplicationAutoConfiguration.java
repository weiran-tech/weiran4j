package com.weiran.cqt.application.autoconfigure;

import com.weiran.cqt.application.setting.SiteConfigApplicationService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/** weiran-cqt 应用层自动配置：登记全部应用服务。 */
@AutoConfiguration
@Import(SiteConfigApplicationService.class)
public class CqtApplicationAutoConfiguration {}
