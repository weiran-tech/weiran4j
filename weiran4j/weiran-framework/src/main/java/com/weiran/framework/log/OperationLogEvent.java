package com.weiran.framework.log;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 一次被 {@link OperationLog} 标注的请求的审计事件。
 *
 * @param userId 操作人 ID，未登录为空
 * @param username 操作人用户名，未登录为空
 * @param module 模块
 * @param description 操作描述
 * @param method HTTP 方法
 * @param path 请求路径
 * @param requestBody 脱敏并截断后的请求体 JSON，无请求体为空
 * @param responseCode 响应码：成功 0，失败为错误码
 * @param success 是否成功
 * @param errorMessage 失败时的提示语（截断到 512）
 * @param durationMs 耗时（毫秒）
 * @param ip 客户端 IP
 * @param userAgent User-Agent（截断到 512）
 * @param createdAt 请求开始时间
 */
public record OperationLogEvent(
        @Nullable Long userId,
        @Nullable String username,
        String module,
        String description,
        String method,
        String path,
        @Nullable String requestBody,
        int responseCode,
        boolean success,
        @Nullable String errorMessage,
        long durationMs,
        String ip,
        String userAgent,
        LocalDateTime createdAt) {}
