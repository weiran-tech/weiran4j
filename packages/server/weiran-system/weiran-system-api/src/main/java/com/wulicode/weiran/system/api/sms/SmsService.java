package com.wulicode.weiran.system.api.sms;

/** 供业务模块调用的 system 短信发送服务。 */
public interface SmsService {

    /** 当前短信发送器是否已启用。 */
    default boolean isAvailable() {
        return false;
    }

    /** 发送一条短信模板消息。 */
    SmsSendResult send(SmsSendCommand command);
}
