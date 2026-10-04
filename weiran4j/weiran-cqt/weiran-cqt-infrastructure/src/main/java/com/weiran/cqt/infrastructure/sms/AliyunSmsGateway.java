package com.weiran.cqt.infrastructure.sms;

import org.jspecify.annotations.Nullable;

/** 阿里云 SendSms 的最小调用面：把 SDK 隔离在一个实现类里，发送逻辑可以用假实现测试。 */
interface AliyunSmsGateway {

    /**
     * 调用 SendSms。
     *
     * @param phone 手机号
     * @param signName 签名名称
     * @param templateCode 模板 CODE
     * @param templateParam 模板参数 JSON
     * @return 阿里云返回
     * @throws Exception SDK 抛出的任何异常（网络、超时、鉴权失败等）
     */
    Reply send(String phone, String signName, String templateCode, String templateParam) throws Exception;

    /**
     * SendSms 返回（业务错误也是 HTTP 200，靠 {@code code} 区分）。
     *
     * @param code 返回码，成功为 {@code OK}
     * @param message 说明
     * @param requestId 请求 ID，排障用
     */
    record Reply(
            @Nullable String code,
            @Nullable String message,
            @Nullable String requestId) {}
}
