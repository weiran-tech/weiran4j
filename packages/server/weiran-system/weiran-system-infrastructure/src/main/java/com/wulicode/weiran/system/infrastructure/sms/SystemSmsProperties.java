package com.wulicode.weiran.system.infrastructure.sms;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** system 短信发送配置。 */
@ConfigurationProperties("weiran.sms")
public record SystemSmsProperties(String mode, Aliyun aliyun) {

    public record Aliyun(String accessKeyId, String accessKeySecret) {}
}
