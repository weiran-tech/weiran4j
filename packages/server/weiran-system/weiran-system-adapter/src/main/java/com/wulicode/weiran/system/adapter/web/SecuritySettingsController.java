package com.wulicode.weiran.system.adapter.web;

import com.wulicode.weiran.framework.auth.RequiresPermission;
import com.wulicode.weiran.framework.log.OperationLog;
import com.wulicode.weiran.framework.response.ApiResponse;
import com.wulicode.weiran.system.application.auth.SecuritySettingsApplicationService;
import com.wulicode.weiran.system.domain.user.SecuritySettings;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

/** 全局安全设置。 */
@RestController
public class SecuritySettingsController {

    private final SecuritySettingsApplicationService service;

    public SecuritySettingsController(final SecuritySettingsApplicationService service) {
        this.service = service;
    }

    @RequiresPermission("system:security:list")
    @GetMapping("/api-backend/system/security/get")
    public SecuritySettings get() {
        return this.service.get();
    }

    @RequiresPermission("system:security:update")
    @OperationLog(module = "安全设置", description = "修改密码策略")
    @PutMapping("/api-backend/system/security/updatePasswordRules")
    public ApiResponse<Void> updatePasswordRules(@Valid @RequestBody final PasswordRulesRequest request) {
        this.service.updatePasswordRules(
                request.minLength(),
                request.maxLength(),
                request.requireLower(),
                request.requireUpper(),
                request.requireDigit(),
                request.requireSymbol());
        return ApiResponse.ok();
    }

    @RequiresPermission("system:security:update")
    @OperationLog(module = "安全设置", description = "修改多因素认证")
    @PutMapping("/api-backend/system/security/updateMfa")
    public ApiResponse<Void> updateMfa(@Valid @RequestBody final MfaRequest request) {
        this.service.updateMfa(request.enabled(), request.rememberDays());
        return ApiResponse.ok();
    }

    public record PasswordRulesRequest(
            @Min(8) @Max(64) int minLength,
            @Min(8) @Max(64) int maxLength,
            boolean requireLower,
            boolean requireUpper,
            boolean requireDigit,
            boolean requireSymbol) {}

    public record MfaRequest(
            boolean enabled, @Min(0) @Max(30) int rememberDays) {}
}
