package com.weiran.cqt.infrastructure.security;

import com.weiran.cqt.domain.account.PasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * BCrypt 密码哈希（宪法 CP-8）。{@link BCryptPasswordEncoder#matches} 原生识别 {@code $2a$/$2b$/$2y$} 前缀，
 * 旧库 Laravel 生成的 {@code $2y$10$} 哈希可直接校验，无需转换。
 */
public final class BCryptPasswordHasher implements PasswordHasher {

    private final BCryptPasswordEncoder encoder;

    /** 按强度构造。 */
    public BCryptPasswordHasher(final int strength) {
        this.encoder = new BCryptPasswordEncoder(strength);
    }

    @Override
    public String hash(final String rawPassword) {
        final String hash = this.encoder.encode(rawPassword);
        if (hash == null) {
            throw new IllegalStateException("BCrypt 计算失败");
        }
        return hash;
    }

    @Override
    public boolean matches(final String rawPassword, final String hash) {
        // 哈希格式非法时 BCryptPasswordEncoder 记 warn 并返回 false，不抛异常。
        return this.encoder.matches(rawPassword, hash);
    }
}
