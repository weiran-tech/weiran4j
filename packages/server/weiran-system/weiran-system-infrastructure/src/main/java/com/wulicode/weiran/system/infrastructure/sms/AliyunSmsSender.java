package com.wulicode.weiran.system.infrastructure.sms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import com.wulicode.weiran.system.domain.sms.SmsSender;
import com.wulicode.weiran.system.domain.sms.SmsSettings;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;

/** 将通用短信发送命令交给阿里云 SendSms。 */
@Slf4j
public final class AliyunSmsSender implements SmsSender {

    private static final String CODE_OK = "OK";
    private static final String CODE_RATE_LIMITED = "isv.BUSINESS_LIMIT_CONTROL";
    private static final String CODE_INVALID_NUMBER = "isv.MOBILE_NUMBER_ILLEGAL";

    private final SmsSettings smsSettings;
    private final AliyunSmsGateway gateway;
    private final ObjectMapper objectMapper;

    AliyunSmsSender(final SmsSettings smsSettings, final AliyunSmsGateway gateway, final ObjectMapper objectMapper) {
        this.smsSettings = smsSettings;
        this.gateway = gateway;
        this.objectMapper = objectMapper;
    }

    public static AliyunSmsSender create(
            final SystemSmsProperties properties, final SmsSettings smsSettings, final ObjectMapper objectMapper) {
        final SystemSmsProperties.Aliyun aliyun = properties.aliyun();
        AliyunSmsSender.requireComplete(aliyun);
        return new AliyunSmsSender(smsSettings, new SdkAliyunSmsGateway(aliyun), objectMapper);
    }

    @Override
    public boolean isAvailable() {
        return !this.smsSettings.signName().isBlank();
    }

    @Override
    @SuppressWarnings("IllegalCatch") // 厂商 SDK/JSON 序列化失败统一作为 FAILED 返回，异常消息可能包含敏感数据。
    public SmsSendOutcome send(
            final String phone, final String templateCode, final Map<String, String> templateParameters) {
        final AliyunSmsGateway.Reply reply;
        try {
            final String signName = this.smsSettings.signName();
            if (signName.isBlank()) {
                AliyunSmsSender.log.warn("阿里云短信签名未在系统配置中设置");
                return SmsSendOutcome.FAILED;
            }
            final String templateParam = this.objectMapper.writeValueAsString(templateParameters);
            reply = this.gateway.send(phone, signName, templateCode, templateParam);
        } catch (final Exception exception) {
            AliyunSmsSender.log.warn(
                    "阿里云短信调用异常 phone={} error={}",
                    AliyunSmsSender.maskPhone(phone),
                    exception.getClass().getSimpleName());
            return SmsSendOutcome.FAILED;
        }

        final SmsSendOutcome outcome = AliyunSmsSender.classify(reply.code());
        if (outcome == SmsSendOutcome.SENT) {
            AliyunSmsSender.log.info(
                    "阿里云短信已发送 phone={} requestId={}", AliyunSmsSender.maskPhone(phone), reply.requestId());
        } else {
            AliyunSmsSender.log.warn(
                    "阿里云短信发送失败 phone={} code={} requestId={}",
                    AliyunSmsSender.maskPhone(phone),
                    reply.code(),
                    reply.requestId());
        }
        return outcome;
    }

    private static void requireComplete(final SystemSmsProperties.Aliyun properties) {
        final List<String> missing = new ArrayList<>();
        if (properties.accessKeyId().isBlank()) {
            missing.add("WEIRAN_SMS_ALIYUN_ACCESS_KEY_ID");
        }
        if (properties.accessKeySecret().isBlank()) {
            missing.add("WEIRAN_SMS_ALIYUN_ACCESS_KEY_SECRET");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("阿里云短信配置不完整或无效，检查环境变量: " + String.join(", ", missing));
        }
    }

    private static SmsSendOutcome classify(final @Nullable String code) {
        if (AliyunSmsSender.CODE_OK.equals(code)) {
            return SmsSendOutcome.SENT;
        }
        if (AliyunSmsSender.CODE_RATE_LIMITED.equals(code)) {
            return SmsSendOutcome.RATE_LIMITED;
        }
        if (AliyunSmsSender.CODE_INVALID_NUMBER.equals(code)) {
            return SmsSendOutcome.INVALID_NUMBER;
        }
        return SmsSendOutcome.FAILED;
    }

    private static String maskPhone(final String phone) {
        final String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return "*".repeat(digits.length());
        }
        return digits.substring(0, Math.min(3, digits.length() - 4)) + "****" + digits.substring(digits.length() - 4);
    }
}
