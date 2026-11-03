package com.wulicode.weiran.system.api.sms;

import java.util.Map;
import java.util.Objects;

/** 短信模板发送命令。模板参数可能含验证码或个人信息，仅显式启用 local 模式时会写入日志。 */
public record SmsSendCommand(String phone, String templateCode, Map<String, String> templateParameters) {

    public SmsSendCommand {
        Objects.requireNonNull(phone, "phone");
        Objects.requireNonNull(templateCode, "templateCode");
        templateParameters = Map.copyOf(Objects.requireNonNull(templateParameters, "templateParameters"));
    }
}
