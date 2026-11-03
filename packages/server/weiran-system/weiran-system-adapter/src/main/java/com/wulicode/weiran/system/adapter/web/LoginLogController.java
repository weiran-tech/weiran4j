package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.page.PageQuery;
import com.wulicode.weiran.framework.page.PageResult;
import com.wulicode.weiran.system.api.loginlog.LoginLogQuery;
import com.wulicode.weiran.system.api.loginlog.LoginLogService;
import com.wulicode.weiran.system.api.loginlog.LoginLogView;
import java.time.LocalDateTime;
import org.jspecify.annotations.Nullable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 登录日志接口。 */
@RestController
@RequestMapping("/api-backend/system/loginLog")
public class LoginLogController {

    private final LoginLogService loginLogService;

    /** 构造控制器。 */
    public LoginLogController(final LoginLogService loginLogService) {
        this.loginLogService = loginLogService;
    }

    /** 分页查询，按 ID 倒序；时间格式 {@code yyyy-MM-dd HH:mm:ss}。 */
    @RequiresPermission("system:login-log:list")
    @GetMapping("/list")
    public PageResult<LoginLogView> page(
            @RequestParam(required = false) final @Nullable String username,
            @RequestParam(required = false) final @Nullable String status,
            @RequestParam(required = false) final @Nullable String eventType,
            @RequestParam(required = false) final @Nullable LocalDateTime startTime,
            @RequestParam(required = false) final @Nullable LocalDateTime endTime,
            @RequestParam(defaultValue = "1") final int page,
            @RequestParam(defaultValue = "20") final int pageSize) {
        return this.loginLogService.page(
                new LoginLogQuery(username, status, eventType, startTime, endTime), new PageQuery(page, pageSize));
    }
}
