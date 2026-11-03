package com.wulicode.weiran.system.domain.sms;

/** 短信发送端口返回的厂商无关结果。 */
public enum SmsSendOutcome {
    SENT,
    LOGGED,
    NOT_CONFIGURED,
    RATE_LIMITED,
    INVALID_NUMBER,
    FAILED
}
