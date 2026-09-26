package com.weiran.system.domain.loginlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 登录日志查询条件，字段为空表示不过滤。
 *
 * @param username 用户名（模糊匹配）
 * @param status 结果
 * @param eventType 事件类型
 * @param startTime 起始时间（含）
 * @param endTime 结束时间（含）
 */
public record LoginLogCriteria(
        @Nullable String username,
        @Nullable String status,
        @Nullable String eventType,
        @Nullable LocalDateTime startTime,
        @Nullable LocalDateTime endTime) {}
