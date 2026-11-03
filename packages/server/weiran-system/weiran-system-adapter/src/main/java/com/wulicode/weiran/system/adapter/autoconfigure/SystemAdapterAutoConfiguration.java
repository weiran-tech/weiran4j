package com.wulicode.weiran.system.adapter.autoconfigure;

import com.wulicode.weiran.system.adapter.web.AuthController;
import com.wulicode.weiran.system.adapter.web.BatchJobController;
import com.wulicode.weiran.system.adapter.web.LoginLogController;
import com.wulicode.weiran.system.adapter.web.MediaController;
import com.wulicode.weiran.system.adapter.web.MenuController;
import com.wulicode.weiran.system.adapter.web.PhoneAuthController;
import com.wulicode.weiran.system.adapter.web.PhoneBindingController;
import com.wulicode.weiran.system.adapter.web.RoleController;
import com.wulicode.weiran.system.adapter.web.SecuritySettingsController;
import com.wulicode.weiran.system.adapter.web.SsoController;
import com.wulicode.weiran.system.adapter.web.UserAccountFieldController;
import com.wulicode.weiran.system.adapter.web.UserController;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Import;

/** weiran-system 适配层自动配置：登记全部 Controller。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({
    AuthController.class,
    BatchJobController.class,
    SsoController.class,
    PhoneAuthController.class,
    PhoneBindingController.class,
    UserController.class,
    UserAccountFieldController.class,
    RoleController.class,
    SecuritySettingsController.class,
    MenuController.class,
    LoginLogController.class,
    MediaController.class,
    SystemStorageWebConfiguration.class
})
public class SystemAdapterAutoConfiguration {}
