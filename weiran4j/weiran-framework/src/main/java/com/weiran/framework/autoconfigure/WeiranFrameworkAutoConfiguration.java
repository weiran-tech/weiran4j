package com.weiran.framework.autoconfigure;

import com.baomidou.mybatisplus.annotation.DbType;
import com.baomidou.mybatisplus.extension.plugins.MybatisPlusInterceptor;
import com.baomidou.mybatisplus.extension.plugins.inner.PaginationInnerInterceptor;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalDateTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.deser.LocalTimeDeserializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalDateTimeSerializer;
import com.fasterxml.jackson.datatype.jsr310.ser.LocalTimeSerializer;
import com.weiran.common.page.PageQuery;
import com.weiran.framework.auth.AuthInterceptor;
import com.weiran.framework.auth.TokenAuthenticator;
import com.weiran.framework.log.OperationLogAspect;
import com.weiran.framework.log.OperationLogRecorder;
import com.weiran.framework.persistence.AuditMetaObjectHandler;
import com.weiran.framework.persistence.AuditorProvider;
import com.weiran.framework.persistence.CurrentUserAuditorProvider;
import com.weiran.framework.time.WeiranTime;
import com.weiran.framework.web.ApiResponseBodyAdvice;
import com.weiran.framework.web.GlobalExceptionHandler;
import com.weiran.framework.web.HealthController;
import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.TimeZone;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.AutoConfiguration;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnWebApplication;
import org.springframework.boot.autoconfigure.jackson.Jackson2ObjectMapperBuilderCustomizer;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Import;
import org.springframework.format.FormatterRegistry;
import org.springframework.format.datetime.standard.DateTimeFormatterRegistrar;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * weiran-framework 自动配置：时间与 Jackson、MyBatis-Plus、认证拦截、统一响应与全局异常、操作日志切面。
 *
 * <p>所有 Bean 都带 {@code @ConditionalOnMissingBean}（Controller 与 advice 除外），
 * 业务模块或应用可以按需替换任意一个。
 */
@AutoConfiguration
public class WeiranFrameworkAutoConfiguration {

    /** 业务时钟，固定在 {@link WeiranTime#ZONE}。测试可替换成固定时钟。 */
    @Bean
    @ConditionalOnMissingBean
    public Clock weiranClock() {
        return Clock.system(WeiranTime.ZONE);
    }

    /** Jackson：java.time 按统一格式与时区序列化。 */
    @Bean
    public Jackson2ObjectMapperBuilderCustomizer weiranJacksonCustomizer() {
        return builder -> builder.timeZone(TimeZone.getTimeZone(WeiranTime.ZONE))
                .serializerByType(LocalDateTime.class, new LocalDateTimeSerializer(WeiranTime.DATE_TIME_FORMATTER))
                .serializerByType(LocalDate.class, new LocalDateSerializer(WeiranTime.DATE_FORMATTER))
                .serializerByType(LocalTime.class, new LocalTimeSerializer(WeiranTime.TIME_FORMATTER))
                .deserializerByType(LocalDateTime.class, new LocalDateTimeDeserializer(WeiranTime.DATE_TIME_FORMATTER))
                .deserializerByType(LocalDate.class, new LocalDateDeserializer(WeiranTime.DATE_FORMATTER))
                .deserializerByType(LocalTime.class, new LocalTimeDeserializer(WeiranTime.TIME_FORMATTER));
    }

    /** MyBatis-Plus 分页与审计字段填充。 */
    @Configuration(proxyBeanMethods = false)
    static class MybatisPlusConfiguration {

        @Bean
        @ConditionalOnMissingBean
        MybatisPlusInterceptor mybatisPlusInterceptor() {
            final MybatisPlusInterceptor interceptor = new MybatisPlusInterceptor();
            final PaginationInnerInterceptor pagination = new PaginationInnerInterceptor(DbType.MYSQL);
            pagination.setMaxLimit((long) PageQuery.MAX_PAGE_SIZE);
            interceptor.addInnerInterceptor(pagination);
            return interceptor;
        }

        @Bean
        @ConditionalOnMissingBean
        AuditorProvider auditorProvider() {
            return new CurrentUserAuditorProvider();
        }

        @Bean
        @ConditionalOnMissingBean
        AuditMetaObjectHandler auditMetaObjectHandler(final Clock clock, final AuditorProvider auditorProvider) {
            return new AuditMetaObjectHandler(clock, auditorProvider);
        }
    }

    /** Web：认证拦截器、请求参数时间格式、统一响应、全局异常、健康检查、操作日志切面。 */
    @Configuration(proxyBeanMethods = false)
    @ConditionalOnWebApplication(type = ConditionalOnWebApplication.Type.SERVLET)
    @Import({ApiResponseBodyAdvice.class, GlobalExceptionHandler.class, HealthController.class})
    static class WebConfiguration {

        @Bean
        @ConditionalOnMissingBean
        AuthInterceptor authInterceptor(final ObjectProvider<TokenAuthenticator> authenticators) {
            return new AuthInterceptor(authenticators);
        }

        @Bean
        WebMvcConfigurer weiranWebMvcConfigurer(final AuthInterceptor authInterceptor) {
            return new WebMvcConfigurer() {
                @Override
                public void addInterceptors(final InterceptorRegistry registry) {
                    registry.addInterceptor(authInterceptor).addPathPatterns("/api/**");
                }

                @Override
                public void addFormatters(final FormatterRegistry registry) {
                    // 查询参数里的时间（如 startTime=2026-09-26 00:00:00）与 JSON 用同一个格式。
                    final DateTimeFormatterRegistrar registrar = new DateTimeFormatterRegistrar();
                    registrar.setDateTimeFormatter(WeiranTime.DATE_TIME_FORMATTER);
                    registrar.setDateFormatter(WeiranTime.DATE_FORMATTER);
                    registrar.setTimeFormatter(WeiranTime.TIME_FORMATTER);
                    registrar.registerFormatters(registry);
                }
            };
        }

        @Bean
        @ConditionalOnMissingBean
        OperationLogAspect operationLogAspect(
                final ObjectProvider<OperationLogRecorder> recorders,
                final ObjectMapper objectMapper,
                final Clock clock) {
            return new OperationLogAspect(recorders, objectMapper, clock);
        }
    }
}
