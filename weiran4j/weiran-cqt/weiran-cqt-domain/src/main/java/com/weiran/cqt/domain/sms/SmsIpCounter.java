package com.weiran.cqt.domain.sms;

/** 按客户端 IP 统计最近一小时成功发出的验证码数。 */
public interface SmsIpCounter {

    /** 该 IP 最近一小时成功发送的条数。 */
    int sentWithinHour(String ip);

    /** 记一次成功发送。 */
    void recordSent(String ip);
}
