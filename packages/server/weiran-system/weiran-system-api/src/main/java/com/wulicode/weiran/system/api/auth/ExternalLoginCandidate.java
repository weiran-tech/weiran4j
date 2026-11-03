package com.wulicode.weiran.system.api.auth;

/** 外部身份已验证且已映射本地用户，但尚未通过手机二次验证或签发会话。 */
public record ExternalLoginCandidate(long userId, String providerId, String successMessage) {}
