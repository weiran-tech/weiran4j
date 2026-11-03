package com.wulicode.weiran.system.domain.sms;

import java.util.Map;

/** 短信发送设施端口。 */
public interface SmsSender {

    /** 当前发送器是否可发送短信。 */
    default boolean isAvailable() {
        return true;
    }

    SmsSendOutcome send(String phone, String templateCode, Map<String, String> templateParameters);
}
