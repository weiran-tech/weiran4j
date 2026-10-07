package com.weiran.platform.adapter.autoconfigure;

import com.weiran.platform.adapter.web.ConfigController;
import com.weiran.platform.adapter.web.DictController;
import com.weiran.platform.adapter.web.OperationLogController;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Import;

/** weiran-platform 适配层自动配置：登记全部 Controller。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({DictController.class, ConfigController.class, OperationLogController.class})
public class PlatformAdapterAutoConfiguration {}
