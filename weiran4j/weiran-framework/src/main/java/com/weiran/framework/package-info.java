/**
 * weiran4j 的 Spring 基础设施。
 *
 * <p>业务模块只依赖这里定义的注解与 SPI（{@code @PublicApi}、{@code @RequiresPermission}、{@code @OperationLog}、
 * {@code TokenAuthenticator}、{@code OperationLogRecorder}、{@code AuditorProvider}），不直接碰拦截器与切面。
 */
@NullMarked
package com.weiran.framework;

import org.jspecify.annotations.NullMarked;
