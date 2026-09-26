package com.weiran.platform.api.config;

/**
 * 公开配置（匿名可读，仅 {@code sys.site.*}）。
 *
 * @param configKey 键
 * @param configValue 值
 */
public record PublicConfigView(String configKey, String configValue) {}
