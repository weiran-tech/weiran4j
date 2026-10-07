package com.weiran.platform.domain.operationlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 一条操作日志。
 *
 * @param id ID，新建时为空
 * @param userId 操作人 ID
 * @param username 操作人用户名
 * @param module 模块
 * @param description 操作描述
 * @param method HTTP 方法
 * @param path 请求路径
 * @param requestBody 脱敏后的请求体
 * @param responseCode 响应码
 * @param success 是否成功
 * @param errorMessage 失败提示
 * @param durationMs 耗时（毫秒）
 * @param ip 客户端 IP
 * @param userAgent User-Agent
 * @param createdAt 时间
 */
public record OperationLogEntry(
        @Nullable Long id,
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
