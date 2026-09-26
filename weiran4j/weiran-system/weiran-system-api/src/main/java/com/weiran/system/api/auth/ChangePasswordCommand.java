package com.weiran.system.api.auth;

/**
 * 修改自己的密码。
 *
 * @param oldPassword 原密码
 * @param newPassword 新密码（8–64 位，含字母与数字）
 */
public record ChangePasswordCommand(String oldPassword, String newPassword) {}
