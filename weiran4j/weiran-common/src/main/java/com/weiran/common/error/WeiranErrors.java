package com.weiran.common.error;

import com.kjs.wuli3.core.error.model.ErrorCode;
import com.kjs.wuli3.core.error.model.ErrorMetadata;
import com.kjs.wuli3.core.error.model.ErrorModule;
import com.kjs.wuli3.core.error.model.ErrorOrigin;
import com.kjs.wuli3.core.error.model.ErrorSeverity;
import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 跨业务模块复用的通用错误码。
 *
 * <p>模块专属错误码定义在各自模块的 {@code error} 包里，不要往这里塞——这里每多一个常量，
 * 就多一处所有模块都要一起编译的耦合点。
 *
 * <p>错误码最终形态由 wuli3 的 {@code DefaultErrorCodeResolver} 拼成
 * {@code <SERVICE>.<MODULE>.<NAME>}，其中 SERVICE 取自 {@code application.service.service-code}。
 */
@Getter
@RequiredArgsConstructor
@ErrorModule(
        name = "COMMON",
        defaultMetadata = @ErrorMetadata(origin = ErrorOrigin.CALLER, severity = ErrorSeverity.NORMAL))
public enum WeiranErrors implements ErrorCode {
    /** 请求参数不满足业务前置条件。 */
    INVALID_ARGUMENT("请求参数不合法"),

    /** 目标资源不存在，或当前调用方无权看到它的存在。 */
    RESOURCE_NOT_FOUND("资源不存在"),

    /** 并发写入冲突，调用方可重试。 */
    CONCURRENT_CONFLICT("操作冲突，请重试");

    private final String message;
}
