package com.weiran.framework.log;

/**
 * 操作日志落库 SPI：由基座模块（weiran-system，platform 包）实现。
 *
 * <p>实现必须是非阻塞且不抛异常的：日志写失败只能记日志，不能影响业务请求的结果。
 * 切面在调用时也会兜底捕获异常，但不要依赖这一点。
 */
public interface OperationLogRecorder {

    /** 记录一条操作日志。 */
    void record(OperationLogEvent event);
}
