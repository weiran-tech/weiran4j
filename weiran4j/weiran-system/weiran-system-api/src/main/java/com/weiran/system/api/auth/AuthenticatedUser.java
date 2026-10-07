package com.weiran.system.api.auth;

/**
 * 凭据校验通过的用户。
 *
 * @param id 用户 ID
 * @param username 用户名
 */
public record AuthenticatedUser(long id, String username) {}
