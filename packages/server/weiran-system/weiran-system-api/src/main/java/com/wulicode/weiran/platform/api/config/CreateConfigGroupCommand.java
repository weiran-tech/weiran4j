package com.wulicode.weiran.platform.api.config;

/** 创建系统配置分组命令。 */
public record CreateConfigGroupCommand(String groupKey, String key, String label) {}
