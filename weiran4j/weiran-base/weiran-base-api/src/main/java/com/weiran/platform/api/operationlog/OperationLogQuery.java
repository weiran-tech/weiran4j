package com.weiran.platform.api.operationlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 操作日志查询条件，字段为空表示不过滤。
 *
 * @param username 用户名（模糊）
 * @param module 模块（模糊）
 * @param success 是否成功
 * @param startTime 起始时间（含）
 * @param endTime 结束时间（含）
 */
public record OperationLogQuery(
        @Nullable String username,
        @Nullable String module,
        @Nullable Boolean success,
        @Nullable LocalDateTime startTime,
        @Nullable LocalDateTime endTime) {}
