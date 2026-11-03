package com.wulicode.weiran.system.application.sms;

import com.wulicode.weiran.platform.api.config.ConfigService;
import com.wulicode.weiran.platform.api.config.ConfigView;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;

/** 通过系统配置动态读取短信签名与验证码模板。 */
public class SystemSmsSettings implements SmsSettings {

    private static final String SIGN_NAME_KEY = "sms.general.sign_name";

    private static final String LOCAL_TEMPLATE_CODE_KEY = "sms.system_tpl.captcha_local";

    private static final String ALIYUN_TEMPLATE_CODE_KEY = "sms.system_tpl.captcha_aliyun";

    private final ConfigService configService;

    private final String mode;

    public SystemSmsSettings(
            final ConfigService configService, @Value("${weiran.sms.mode:disabled}") final String mode) {
        this.configService = configService;
        this.mode = mode;
    }

    @Override
    public String signName() {
        return this.values().getOrDefault(SystemSmsSettings.SIGN_NAME_KEY, "").strip();
    }

    @Override
    public String verificationTemplateCode() {
        return this.values().getOrDefault(this.templateCodeKey(), "").strip();
    }

    @Override
    public boolean verificationTemplateReady() {
        final String template = this.verificationTemplateCode();
        return !template.isBlank() && (!"local".equals(this.mode) || template.contains("${code}"));
    }

    @Override
    public boolean isLocalMode() {
        return "local".equals(this.mode);
    }

    private Map<String, String> values() {
        return this.configService.all().stream()
                .filter(config -> config.configKey().startsWith("sms."))
                .collect(Collectors.toMap(ConfigView::configKey, ConfigView::configValue, (first, ignored) -> first));
    }

    private String templateCodeKey() {
        return "aliyun".equals(this.mode)
                ? SystemSmsSettings.ALIYUN_TEMPLATE_CODE_KEY
                : SystemSmsSettings.LOCAL_TEMPLATE_CODE_KEY;
    }
}
