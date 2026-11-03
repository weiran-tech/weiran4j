package com.wulicode.weiran.framework.web;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标在 Controller 类或方法上：返回值原样写出，不经 {@link ApiResponseBodyAdvice} 包成 {@code {code, message, data}}。
 *
 * <p>用于文件下载，或 API 前缀之外确实需要自定义响应格式的入口。
 * 普通 JSON API 的前端依赖数字 {@code code: 0} 判成功，不能在这种接口上使用。
 *
 * <p>也可作元注解：下游可以自己组合出 {@code @WebApi} 之类的注解。异常不受本注解影响，仍由全局异常处理器输出。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target({ElementType.TYPE, ElementType.METHOD})
public @interface SkipApiResponse {}
