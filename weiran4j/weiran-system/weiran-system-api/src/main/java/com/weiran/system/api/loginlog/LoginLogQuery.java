package com.weiran.system.api.loginlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 登录日志查询条件，字段为空表示不过滤。
 *
 * @param username 用户名（模糊）
 * @param status {@code success / fail}
 * @param eventType {@code login / logout}
 * @param startTime 起始时间（含）
 * @param endTime 结束时间（含）
 */
public record LoginLogQuery(
        @Nullable String username,
        @Nullable String status,
        @Nullable String eventType,
        @Nullable LocalDateTime startTime,
        @Nullable LocalDateTime endTime) {}
