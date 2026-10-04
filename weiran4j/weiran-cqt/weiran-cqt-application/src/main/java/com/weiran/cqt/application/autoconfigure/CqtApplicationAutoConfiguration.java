package com.weiran.cqt.application.autoconfigure;

import com.weiran.cqt.application.account.AccountApplicationService;
import com.weiran.cqt.application.file.FileUploadApplicationService;
import com.weiran.cqt.application.portal.PortalAuthApplicationService;
import com.weiran.cqt.application.region.RegionApplicationService;
import com.weiran.cqt.application.setting.SiteConfigApplicationService;
import com.weiran.cqt.application.sms.SmsApplicationService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.context.annotation.Import;

/** weiran-cqt 应用层自动配置：登记全部应用服务。 */
@AutoConfiguration
@Import({
    SiteConfigApplicationService.class,
    SmsApplicationService.class,
    AccountApplicationService.class,
    PortalAuthApplicationService.class,
    RegionApplicationService.class,
    FileUploadApplicationService.class
})
public class CqtApplicationAutoConfiguration {}
