package com.weiran.system.adapter.autoconfigure;

import com.weiran.system.adapter.web.AuthController;
import com.weiran.system.adapter.web.DepartmentController;
import com.weiran.system.adapter.web.LoginLogController;
import com.weiran.system.adapter.web.MenuController;
import com.weiran.system.adapter.web.RoleController;
import com.weiran.system.adapter.web.UserController;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Import;

/** weiran-system 适配层自动配置：登记全部 Controller。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({
    AuthController.class,
    UserController.class,
    RoleController.class,
    MenuController.class,
    DepartmentController.class,
    LoginLogController.class
})
public class SystemAdapterAutoConfiguration {}
