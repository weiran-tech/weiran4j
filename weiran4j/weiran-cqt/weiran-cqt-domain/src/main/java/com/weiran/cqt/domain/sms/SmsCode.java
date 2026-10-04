package com.weiran.cqt.domain.sms;

import java.time.Instant;

/**
 * 已发送的验证码。
 *
 * @param code 6 位验证码
 * @param sentAt 发送时间
 * @param expiresAt 过期时间
 * @param failedAttempts 已校验失败的次数
 */
public record SmsCode(String code, Instant sentAt, Instant expiresAt, int failedAttempts) {}
