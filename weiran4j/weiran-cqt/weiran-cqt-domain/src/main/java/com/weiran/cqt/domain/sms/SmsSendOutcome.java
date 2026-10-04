package com.weiran.cqt.domain.sms;

/** 短信发送结果（由发送实现按服务商返回归类）。 */
public enum SmsSendOutcome {

    /** 已发送。 */
    SENT,

    /** 服务商频控（如同一号码发送过于频繁）。 */
    RATE_LIMITED,

    /** 服务商判定号码非法。 */
    INVALID_NUMBER,

    /** 其它失败：服务商返回的其它错误、调用异常或超时。 */
    FAILED
}
