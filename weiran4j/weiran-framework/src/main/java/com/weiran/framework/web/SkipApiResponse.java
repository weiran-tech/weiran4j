package com.weiran.framework.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标在 Controller 类或方法上：返回值原样写出，不经 {@link ApiResponseBodyAdvice} 包成 {@code {code, message, data}}。
 *
 * <p>只用于 {@code /api/**} 之外、需要自定响应格式的接口（如 fork 下游给 uniapp 的 {@code /api-web/**}）。
 * {@code /api/**} 的前端依赖数字 {@code code: 0} 判成功，在那里使用会让前端把成功当失败。
 *
 * <p>也可作元注解：下游可以自己组合出 {@code @WebApi} 之类的注解。异常不受本注解影响，仍由全局异常处理器输出。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface SkipApiResponse {}
