package com.weiran.system.domain.port;

import java.time.Duration;

/**
 * 访问令牌签发与解析端口。
 *
 * <p>令牌里带一个由账号密码哈希派生的 {@code stamp}（PHP 版叫 {@code salt}）：
 * 密码一变，已签发的令牌全部失效。没有它，改密后旧令牌能一直用到自然过期——
 * 这正是「改了密码就该踢下线」这个预期落不了地的原因。
 */
public interface AccessTokenIssuer {

    /** 为指定账号签发令牌。 */
    IssuedToken issue(long accountId, String accountType, String stamp);

    /**
     * 解析并校验令牌。
     *
     * <p>签名不通过、格式非法或已过期时抛出 {@code SystemErrors.TOKEN_*} 业务异常，
     * 不返回 empty——调用方分不清「没带令牌」和「令牌是伪造的」会写出错误的兜底逻辑。
     */
    TokenPayload parse(String token);

    /**
     * 签发结果。
     *
     * @param token 令牌串
     * @param expiresIn 有效期
     */
    record IssuedToken(String token, Duration expiresIn) {}

    /**
     * 令牌载荷。
     *
     * @param accountId 账号 ID
     * @param accountType 账号类型落库取值
     * @param stamp 密码指纹，用于判断令牌是否因改密而失效
     */
    record TokenPayload(long accountId, String accountType, String stamp) {}
}
