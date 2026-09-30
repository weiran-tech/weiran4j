package com.weiran.system.domain.loginlog;

import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;

/**
 * 一条登录 / 登出记录。
 *
 * @param id ID，新建时为空
 * @param userId 用户 ID；用户名不存在的失败登录为空
 * @param username 登录时提交的用户名
 * @param ip 客户端 IP
 * @param userAgent User-Agent
 * @param browser 浏览器
 * @param os 操作系统
 * @param eventType {@link #EVENT_LOGIN} 或 {@link #EVENT_LOGOUT}
 * @param status {@link #STATUS_SUCCESS} 或 {@link #STATUS_FAIL}
 * @param message 结果说明
 * @param createdAt 发生时间
 */
public record LoginLog(
        @Nullable Long id,
        @Nullable Long userId,
        String username,
        String ip,
        String userAgent,
        String browser,
        String os,
        String eventType,
        String status,
        String message,
        LocalDateTime createdAt) {

    /** 事件类型：登录。 */
    public static final String EVENT_LOGIN = "login";

    /** 事件类型：登出。 */
    public static final String EVENT_LOGOUT = "logout";

    /** 结果：成功。 */
    public static final String STATUS_SUCCESS = "success";

    /** 结果：失败。 */
    public static final String STATUS_FAIL = "fail";
}
