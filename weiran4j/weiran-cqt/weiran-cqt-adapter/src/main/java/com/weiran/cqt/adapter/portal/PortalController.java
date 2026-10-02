package com.weiran.cqt.adapter.portal;

import com.weiran.framework.web.SkipApiResponse;
import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;
import org.springframework.web.bind.annotation.RestController;

/**
 * 前台（uniapp）接口的 Controller 注解：{@code @RestController} + {@link SkipApiResponse}。
 *
 * <p>标了它的 Controller 返回 {@link PortalResult}（{@code {code:200}}），异常由 {@link PortalExceptionAdvice} 统一输出，
 * 路径必须在 {@code /api-web/**} 下才会经过 {@link PortalAuthInterceptor}。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.TYPE)
@RestController
@SkipApiResponse
public @interface PortalController {}
