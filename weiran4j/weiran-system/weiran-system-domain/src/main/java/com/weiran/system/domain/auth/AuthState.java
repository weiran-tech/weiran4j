package com.weiran.system.domain.auth;

/**
 * 判定令牌吊销所需的账号状态。
 *
 * @param tokenVersion 当前令牌版本
 * @param enabled 账号是否启用
 */
public record AuthState(int tokenVersion, boolean enabled) {}
