package com.wulicode.weiran.system.domain.sms;

/** 从短信配置读取当前发送模式的签名与验证码模板。 */
public interface SmsSettings {

    /** 是否为只记录短信的本地模式。 */
    default boolean isLocalMode() {
        return false;
    }

    String signName();

    String verificationTemplateCode();

    /** 当前模式的验证码模板是否可用于登录。 */
    default boolean verificationTemplateReady() {
        return !this.verificationTemplateCode().isBlank();
    }
}
