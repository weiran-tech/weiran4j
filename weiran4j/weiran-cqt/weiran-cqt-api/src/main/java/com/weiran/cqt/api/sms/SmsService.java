package com.weiran.cqt.api.sms;

import org.jspecify.annotations.Nullable;

/** 短信验证码。 */
public interface SmsService {

    /**
     * 向手机号发送验证码。
     *
     * @param phone 手机号（11 位数字）
     * @param clientIp 可信的客户端 IP（用于每小时发送上限）
     * @return 发送结果；只有开发模式开启回显时带验证码
     */
    SmsSendResult send(@Nullable String phone, String clientIp);

    /**
     * 校验并消耗验证码；失败抛 {@code CqtErrors.SMS_CODE_INVALID}。
     *
     * @param phone 手机号
     * @param code 用户输入的验证码
     */
    void verify(String phone, @Nullable String code);
}
