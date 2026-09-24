package com.weiran.system.infrastructure.security;

import com.weiran.system.domain.account.Account;
import com.weiran.system.domain.port.PasswordStampFactory;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;

/**
 * 密码指纹实现：对密码哈希与盐值再做一次 SHA-256，取前 16 个十六进制字符。
 *
 * <p>为什么不直接把密码哈希写进令牌：JWT 载荷是 base64 明文可读的，
 * 令牌一旦泄露就等于泄露了 BCrypt 哈希，可离线爆破。再摘要一次是单向的，
 * 既满足「密码变则指纹变」，又不暴露可爆破的材料。
 *
 * <p>截断到 16 字符是长度与碰撞概率的取舍：这里只需要检出「密码变了」，
 * 不是抗碰撞签名，而令牌每多一字节都会出现在每个请求头里。
 *
 * <p>PHP 版用的是 {@code md5(sha1(password_key) . password)}，语义相同但摘要已破；
 * 两套系统的令牌因此互不通用——迁移时需要用户重新登录一次，这是有意的取舍。
 */
public final class Sha256PasswordStampFactory implements PasswordStampFactory {

    /** 指纹保留的十六进制字符数。 */
    public static final int STAMP_LENGTH = 16;

    @Override
    public String stampOf(final Account account) {
        final String material = (account.getPasswordHash() == null ? "" : account.getPasswordHash())
                + '|'
                + (account.getPasswordKey() == null ? "" : account.getPasswordKey());

        try {
            final MessageDigest digest = MessageDigest.getInstance("SHA-256");
            final String hex = HexFormat.of().formatHex(digest.digest(material.getBytes(StandardCharsets.UTF_8)));
            return hex.substring(0, Sha256PasswordStampFactory.STAMP_LENGTH);
        } catch (final NoSuchAlgorithmException error) {
            throw new IllegalStateException("SHA-256 必须由 JDK 提供", error);
        }
    }
}
