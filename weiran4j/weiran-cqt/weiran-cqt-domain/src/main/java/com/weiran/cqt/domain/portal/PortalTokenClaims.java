package com.weiran.cqt.domain.portal;

/**
 * 前台令牌载荷。
 *
 * @param accountId 账号 ID
 * @param version 签发时账号的令牌版本（{@code token_version}），认证时与库中值比对，不一致即失效
 */
public record PortalTokenClaims(long accountId, int version) {}
