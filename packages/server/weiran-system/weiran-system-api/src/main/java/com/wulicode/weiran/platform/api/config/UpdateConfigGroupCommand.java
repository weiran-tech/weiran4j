package com.wulicode.weiran.platform.api.config;

/** 修改系统配置分组名称。 */
public record UpdateConfigGroupCommand(String groupKey, String key, String label) {}
