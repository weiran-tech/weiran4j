/**
 * weiran4j 框架层：跨模块通用契约 + Spring 基础设施。
 *
 * <p>两类内容按包分开（D-016）：
 *
 * <ul>
 *   <li>纯 Java 契约——{@code error}、{@code page}、{@code response}、{@code status}、{@code text}、{@code tree}。
 *       业务模块的 domain / api 层只能用这些包；它们不得引用任何框架类型。
 *   <li>Spring 基础设施——{@code web}、{@code auth}、{@code log}、{@code persistence}、{@code autoconfigure}、{@code time}。
 *       业务模块只依赖这里定义的注解与 SPI（{@code @PublicApi}、{@code @RequiresPermission}、{@code @OperationLog}、
 *       {@code TokenAuthenticator}、{@code OperationLogRecorder}、{@code AuditorProvider}），不直接碰拦截器与切面。
 * </ul>
 *
 * <p>Spring 与 MyBatis-Plus 以 {@code implementation} 引入、不向下游传递，domain / api 层编译期因此看不到框架类型。
 * 业务语义一律留在各自模块，这里一旦开始堆业务，模块边界就失效了。
 */
@NullMarked
package com.weiran.framework;

import org.jspecify.annotations.NullMarked;
