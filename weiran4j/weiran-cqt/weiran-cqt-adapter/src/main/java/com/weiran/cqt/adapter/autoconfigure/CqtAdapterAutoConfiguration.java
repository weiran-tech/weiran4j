package com.weiran.cqt.adapter.autoconfigure;

import com.weiran.cqt.adapter.portal.AuthController;
import com.weiran.cqt.adapter.portal.CompetCategoryController;
import com.weiran.cqt.adapter.portal.PortalAuthInterceptor;
import com.weiran.cqt.adapter.portal.PortalExceptionAdvice;
import com.weiran.cqt.adapter.portal.ProductController;
import com.weiran.cqt.api.portal.PortalAuthService;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** weiran-cqt 适配层自动配置：登记前台 Controller、异常出口与 {@code /api-web/**} 认证拦截器。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({PortalExceptionAdvice.class, ProductController.class, AuthController.class, CompetCategoryController.class})
public class CqtAdapterAutoConfiguration {

    /** 前台认证拦截器。 */
    @Bean
    public PortalAuthInterceptor portalAuthInterceptor(final PortalAuthService authService) {
        return new PortalAuthInterceptor(authService);
    }

    /** 只把前台拦截器挂在 {@code /api-web/**}；后台 {@code /api/**} 由框架拦截器负责，两者路径不相交。 */
    @Bean
    public WebMvcConfigurer cqtPortalWebMvcConfigurer(final PortalAuthInterceptor portalAuthInterceptor) {
        return new WebMvcConfigurer() {
            @Override
            public void addInterceptors(final InterceptorRegistry registry) {
                registry.addInterceptor(portalAuthInterceptor).addPathPatterns("/api-web/**");
            }
        };
    }
}
