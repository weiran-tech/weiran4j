package com.weiran.cqt.adapter.autoconfigure;

import com.weiran.cqt.adapter.portal.AuthController;
import com.weiran.cqt.adapter.portal.CompetCategoryController;
import com.weiran.cqt.adapter.portal.CompetitionController;
import com.weiran.cqt.adapter.portal.LocalFilesController;
import com.weiran.cqt.adapter.portal.PortalAuthInterceptor;
import com.weiran.cqt.adapter.portal.PortalExceptionAdvice;
import com.weiran.cqt.adapter.portal.ProductController;
import com.weiran.cqt.api.portal.PortalAuthService;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.ResourceHandlerRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/** weiran-cqt 适配层自动配置：登记前台 Controller、异常出口与 {@code /api-web/**} 认证拦截器。 */
@AutoConfiguration
@ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
@Import({
    PortalExceptionAdvice.class,
    ProductController.class,
    AuthController.class,
    CompetCategoryController.class,
    LocalFilesController.class,
    CompetitionController.class
})
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

    /**
     * 本地存储模式（仅开发 / 测试）下经 {@code /uploads/**} 提供已上传文件；OSS 模式下文件直接走 OSS 公网地址，不注册。
     */
    @Bean
    @ConditionalOnProperty(prefix = "weiran.cqt.storage", name = "mode", havingValue = "local")
    public WebMvcConfigurer cqtLocalUploadsWebMvcConfigurer(
            @Value("${weiran.cqt.storage.local.root}") final String root,
            @Value("${weiran.cqt.storage.local.url-prefix:/uploads}") final String urlPrefix) {
        final String location =
                Path.of(root).toAbsolutePath().normalize().toUri().toString();
        final String pattern = urlPrefix.replaceAll("/+$", "") + "/**";
        return new WebMvcConfigurer() {
            @Override
            public void addResourceHandlers(final ResourceHandlerRegistry registry) {
                registry.addResourceHandler(pattern)
                        .addResourceLocations(location.endsWith("/") ? location : location + "/");
            }
        };
    }
}
