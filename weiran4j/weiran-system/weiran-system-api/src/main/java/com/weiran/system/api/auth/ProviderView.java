package com.weiran.system.api.auth;

/**
 * 外部身份提供方（只含展示用信息，不含任何密钥与地址）。
 *
 * @param id 提供方 id
 * @param type {@code oidc} 或 {@code cas}
 * @param name 显示名称
 */
public record ProviderView(String id, String type, String name) {}
