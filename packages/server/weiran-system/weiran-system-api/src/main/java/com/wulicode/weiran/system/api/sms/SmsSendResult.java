package com.wulicode.weiran.system.api.sms;

/** 短信发送的稳定结果分类。 */
public enum SmsSendResult {
    SENT,
    LOGGED,
    NOT_CONFIGURED,
    RATE_LIMITED,
    INVALID_NUMBER,
    FAILED
}
