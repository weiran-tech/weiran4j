package com.wulicode.weiran.system.infrastructure.autoconfigure;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.sms.SmsSender;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import com.wulicode.weiran.system.infrastructure.sms.DisabledSmsSender;
import com.wulicode.weiran.system.infrastructure.sms.LocalSmsSender;
import com.wulicode.weiran.system.infrastructure.sms.SystemSmsProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class SystemSmsModeTest {

    private final SystemInfrastructureAutoConfiguration configuration = new SystemInfrastructureAutoConfiguration();

    private final SmsSettings smsSettings = new SmsSettings() {
        @Override
        public String signName() {
            return "";
        }

        @Override
        public String verificationTemplateCode() {
            return "";
        }
    };

    @Test
    @DisplayName("disabled 模式保持默认关闭")
    void createsDisabledSender() {
        final SystemSmsProperties properties =
                new SystemSmsProperties("disabled", new SystemSmsProperties.Aliyun("", ""));

        final SmsSender sender = this.configuration.systemSmsSender(properties, new ObjectMapper(), this.smsSettings);

        assertThat(sender).isInstanceOf(DisabledSmsSender.class);
    }

    @Test
    @DisplayName("local 模式装配本地 sender 且不要求阿里云凭据")
    void createsLogSenderWithoutCloudCredentials() {
        final SystemSmsProperties properties = new SystemSmsProperties("local", new SystemSmsProperties.Aliyun("", ""));

        final SmsSender sender = this.configuration.systemSmsSender(properties, new ObjectMapper(), this.smsSettings);

        assertThat(sender).isInstanceOf(LocalSmsSender.class);
    }
}
