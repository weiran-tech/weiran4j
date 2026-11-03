package com.wulicode.weiran.system.infrastructure.sms;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.wulicode.weiran.system.domain.sms.SmsSendOutcome;
import com.wulicode.weiran.system.domain.sms.SmsSender;
import java.util.Map;
import lombok.extern.slf4j.Slf4j;

/** 仅记录短信内容、不连接短信服务的开发与联调 sender。 */
@Slf4j
public final class LogSmsSender implements SmsSender {

    private final ObjectMapper objectMapper;

    public LogSmsSender(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    @SuppressWarnings("IllegalCatch") // 统一处理序列化失败，避免把模板内容或异常消息写入日志。
    public SmsSendOutcome send(final String phone, final String templateCode, final Map<String, String> parameters) {
        try {
            final String templateParameters = this.objectMapper.writeValueAsString(parameters);
            LogSmsSender.log.info(
                    "短信 log 模式 phone={} templateCode={} templateParameters={}",
                    LogSmsSender.maskPhone(phone),
                    templateCode,
                    templateParameters);
            return SmsSendOutcome.LOGGED;
        } catch (final Exception exception) {
            LogSmsSender.log.warn(
                    "短信 log 模式记录失败 phone={} error={}",
                    LogSmsSender.maskPhone(phone),
                    exception.getClass().getSimpleName());
            return SmsSendOutcome.FAILED;
        }
    }

    private static String maskPhone(final String phone) {
        final String digits = phone.replaceAll("\\D", "");
        if (digits.length() <= 4) {
            return "*".repeat(digits.length());
        }
        return digits.substring(0, Math.min(3, digits.length() - 4)) + "****" + digits.substring(digits.length() - 4);
    }
}
