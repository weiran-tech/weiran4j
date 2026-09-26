package com.weiran.system.api.loginlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 登录日志视图。
 *
 * @param id ID
 * @param userId 用户 ID
 * @param username 用户名
 * @param ip IP
 * @param browser 浏览器
 * @param os 操作系统
 * @param userAgent User-Agent
 * @param eventType {@code login / logout}
 * @param status {@code success / fail}
 * @param message 结果说明
 * @param createdAt 时间
 */
public record LoginLogView(
        long id,
        @Nullable Long userId,
        String username,
        String ip,
        String browser,
        String os,
        String userAgent,
        String eventType,
        String status,
        String message,
        LocalDateTime createdAt) {}
