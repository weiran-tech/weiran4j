package com.wulicode.weiran.system.application.auth;

import com.wulicode.weiran.framework.error.BizException;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import com.wulicode.weiran.system.domain.user.SecuritySettings;
import com.wulicode.weiran.system.domain.user.SecuritySettingsRepository;
import org.springframework.transaction.annotation.Transactional;

/** 管理员维护全局密码与多因素认证规则。 */
public class SecuritySettingsApplicationService {

    private final SecuritySettingsRepository repository;

    private final SmsService smsService;

    private final SmsSettings smsSettings;

    public SecuritySettingsApplicationService(
            final SecuritySettingsRepository repository, final SmsService smsService, final SmsSettings smsSettings) {
        this.repository = repository;
        this.smsService = smsService;
        this.smsSettings = smsSettings;
    }

    public SecuritySettings get() {
        return this.repository.load();
    }

    @Transactional
    public void updatePasswordRules(
            final int min,
            final int max,
            final boolean lower,
            final boolean upper,
            final boolean digit,
            final boolean symbol) {
        final SecuritySettings next = this.repository.load().withPasswordRules(min, max, lower, upper, digit, symbol);
        this.save(next);
    }

    @Transactional
    public void updateMfa(final boolean enabled, final int rememberDays) {
        if (enabled) {
            if (!this.smsService.isAvailable() || !this.smsSettings.verificationTemplateReady()) {
                throw BizException.badRequest("请先启用短信发送器并配置验证码模板");
            }
        }
        this.save(this.repository.load().withMfa(enabled, rememberDays));
    }

    private void save(final SecuritySettings next) {
        if (!this.repository.save(next)) {
            throw BizException.conflict("安全设置已被其他人修改，请刷新后重试");
        }
    }
}
