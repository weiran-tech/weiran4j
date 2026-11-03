package com.wulicode.weiran.system.infrastructure.sms;

import org.jspecify.annotations.Nullable;

/** 阿里云 SDK 边界。 */
interface AliyunSmsGateway {

    Reply send(String phone, String signName, String templateCode, String templateParam) throws Exception;

    record Reply(@Nullable String code, @Nullable String requestId) {}
}
