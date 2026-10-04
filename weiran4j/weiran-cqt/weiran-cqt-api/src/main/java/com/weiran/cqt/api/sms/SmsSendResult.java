package com.weiran.cqt.api.sms;

import org.jspecify.annotations.Nullable;

/**
 * 发送结果。
 *
 * @param sent 是否已发送
 * @param code 验证码，只有开发模式开启回显时非空
 */
public record SmsSendResult(boolean sent, @Nullable String code) {}
