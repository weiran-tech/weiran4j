package com.weiran.system.infrastructure.security;

import com.weiran.system.domain.user.PasswordHasher;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/** BCrypt 密码哈希（只用 spring-security-crypto，不引入 Spring Security 过滤器链）。 */
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
