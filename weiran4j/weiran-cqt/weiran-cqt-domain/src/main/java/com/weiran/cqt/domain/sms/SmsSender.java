package com.weiran.cqt.domain.sms;

/** 短信发送端口。未注册任何实现时视为「短信服务未配置」。 */
public interface SmsSender {

    /**
     * 发送验证码短信。实现不得抛出异常：一切失败都归类为 {@link SmsSendOutcome} 返回。
     *
     * @param phone 手机号
     * @param code 验证码
     * @return 发送结果
     */
    SmsSendOutcome send(String phone, String code);

    /** 是否允许把验证码回显在接口响应里（只有开发模式可以开启）。 */
    default boolean exposesCode() {
        return false;
    }
}
