package com.wulicode.weiran.system.api.user;

/** 管理员单字段修改用户账号信息。 */
public record UpdateUserAccountFieldCommand(String field, String value) {}
