package com.weiran.system.api.user;

/**
 * 用户下拉选项。
 *
 * @param id ID
 * @param username 用户名
 * @param nickname 昵称
 */
public record UserOption(long id, String username, String nickname) {}
