package com.weiran.framework.log;

import java.lang.annotation.Documented;
import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * 标在 Controller 写操作方法上：记录一条操作日志。
 *
 * <p>请求体中的密码、令牌等敏感字段会被替换为 {@code ******}，整体截断到 4096 字符。
 * 容器里没有 {@link OperationLogRecorder} 时注解不生效。
 */
@Documented
@Retention(RetentionPolicy.RUNTIME)
@Target(ElementType.METHOD)
public @interface OperationLog {

    /** 所属模块，如「用户管理」。 */
    String module();

    /** 操作描述，如「新增用户」。 */
    String description();
}
