package com.wulicode.weiran.system.application.auth;

import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.ConfigView;
import com.wulicode.weiran.system.api.sms.SmsService;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import java.util.Map;
import java.util.stream.Collectors;

/** 手机号验证码登录的动态设置。 */
public class PhoneLoginSettings {

    private static final String ENABLED_KEY = "system.user.enable_phone_login";

    private final ConfigService configService;

    private final SmsService smsService;

    private final SmsSettings smsSettings;

    public PhoneLoginSettings(
            final ConfigService configService, final SmsService smsService, final SmsSettings smsSettings) {
        this.configService = configService;
        this.smsService = smsService;
        this.smsSettings = smsSettings;
    }

    /** 管理开关、发送器与短信模板均就绪时才开放登录。 */
    public boolean isEnabled() {
        final Map<String, String> values = this.values();
        return this.smsService.isAvailable()
                && Boolean.parseBoolean(values.getOrDefault(PhoneLoginSettings.ENABLED_KEY, "false"))
                && this.smsSettings.verificationTemplateReady();
    }

    /** 已配置的验证码短信模板 CODE。 */
    public String templateCode() {
        return this.smsSettings.verificationTemplateCode();
    }

    public boolean templateReady() {
        return this.smsSettings.verificationTemplateReady();
    }

    /** 只有本地模式的验证码可写入登录日志供联调。 */
    public boolean isLocalMode() {
        return this.smsSettings.isLocalMode();
    }

    private Map<String, String> values() {
        return this.configService.all().stream()
                .filter(config -> config.configKey().equals(PhoneLoginSettings.ENABLED_KEY))
                .collect(Collectors.toMap(ConfigView::configKey, ConfigView::configValue, (first, ignored) -> first));
    }
}
