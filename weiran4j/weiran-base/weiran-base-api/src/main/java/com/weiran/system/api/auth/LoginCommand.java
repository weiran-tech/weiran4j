package com.weiran.system.api.auth;

/**
 * 登录命令。
 *
 * @param username 用户名
 * @param password 明文密码
 */
public record LoginCommand(String username, String password) {}
