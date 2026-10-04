package com.weiran.cqt.infrastructure.sms;

import com.weiran.cqt.domain.account.Phones;
import com.weiran.cqt.domain.sms.SmsSendOutcome;
import com.weiran.cqt.domain.sms.SmsSender;
import lombok.extern.slf4j.Slf4j;

/**
 * 开发模式短信：不真正发送，只把验证码记到 warn 日志（仅 {@code weiran.cqt.sms.mode=dev} 时注册）。
 *
 * <p>生产环境禁止使用：验证码进日志等于把它交给能看日志的所有人。
 */
@Slf4j
public final class DevSmsSender implements SmsSender {

    private final boolean exposeCode;

    /**
     * 构造发送器。
     *
     * @param exposeCode 是否允许把验证码回显在接口响应里
     */
    public DevSmsSender(final boolean exposeCode) {
        this.exposeCode = exposeCode;
    }

    @Override
    public SmsSendOutcome send(final String phone, final String code) {
        DevSmsSender.log.warn("开发模式短信 phone={} code={}", Phones.mask(phone), code);
        return SmsSendOutcome.SENT;
    }

    @Override
    public boolean exposesCode() {
        return this.exposeCode;
    }
}
