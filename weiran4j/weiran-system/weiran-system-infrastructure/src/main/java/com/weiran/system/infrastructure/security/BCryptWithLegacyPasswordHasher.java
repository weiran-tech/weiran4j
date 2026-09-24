package com.weiran.system.infrastructure.security;

import com.weiran.system.domain.port.PasswordHasher;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.HexFormat;
import java.util.Locale;
import org.jspecify.annotations.Nullable;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

/**
 * BCrypt 为主、PHP 历史算法为回落的密码哈希实现。
 *
 * <p>历史算法是 {@code md5(sha1(明文 + 注册时间字符串) + password_key)}，来自
 * weiran-v1 的 {@code DefaultPasswordProvider::genPassword}。它有三个问题：md5 与 sha1 都已破、
 * 没有工作因子、盐值只有 6 位。因此它只用于**校验**存量账号，绝不用于生成新哈希；
 * 一旦某个历史账号成功登录，应用层会立刻用 BCrypt 重哈希（懒迁移）。
 *
 * <p>识别方式按前缀：BCrypt 哈希以 {@code $2a$} / {@code $2b$} / {@code $2y$} 开头，
 * 历史哈希是 32 位十六进制。两者形态不重叠，不需要额外的版本列。
 *
 * <p>⚠️ 迁移前必须先把 {@code pam_account.password} 从 {@code varchar(45)} 放宽到至少
 * {@code varchar(72)}：BCrypt 哈希固定 60 字符，写进 45 列会被静默截断，
 * 表现为「改密成功但从此登不进去」。
 */
public final class BCryptWithLegacyPasswordHasher implements PasswordHasher {

    private static final String LEGACY_HASH_PATTERN = "^[0-9a-f]{32}$";

    /**
     * 历史算法参与摘要的注册时间格式。
     *
     * <p>必须与 Laravel 的 {@code Carbon::toDateTimeString()} 逐字符一致（{@code 2019-05-01 08:30:00}）。
     * 用 {@code LocalDateTime.toString()} 会得到 ISO 的 {@code 2019-05-01T08:30}——中间是 T、秒被省略，
     * 摘要结果完全不同，表现为「所有存量账号密码都错」。
     *
     * <p>必须显式传 {@link Locale#ROOT}：不传就跟随 JVM 默认 locale，而某些 locale
     * （如 {@code th-TH}）用佛历纪年，同一时刻会格式化出不同的年份字符串——
     * 部署到那样的机器上，全部存量账号会在毫无征兆的情况下集体登录失败。
     */
    private static final DateTimeFormatter LEGACY_TIME_FORMAT =
            DateTimeFormatter.ofPattern("uuuu-MM-dd HH:mm:ss", Locale.ROOT);

    private final BCryptPasswordEncoder encoder;

    /** 使用指定 BCrypt 强度构造。强度越高越慢，10~12 是常见取值。 */
    public BCryptWithLegacyPasswordHasher(final int strength) {
        this.encoder = new BCryptPasswordEncoder(strength);
    }

    @Override
    public HashedPassword hash(final String rawPassword) {
        // BCrypt 自带盐并编码在哈希串里，password_key 列对新账号不再有意义，写空串而不是 null，
        // 与 PHP 侧「该列 NOT NULL DEFAULT ''」的约束保持一致。
        return new HashedPassword(this.encoder.encode(rawPassword), "");
    }

    @Override
    public VerificationResult verify(
            final String rawPassword,
            final String storedHash,
            final @Nullable String passwordKey,
            final @Nullable LocalDateTime registeredAt) {
        if (storedHash.startsWith("$2")) {
            return this.encoder.matches(rawPassword, storedHash)
                    ? VerificationResult.ok()
                    : VerificationResult.failed();
        }

        if (!storedHash.matches(BCryptWithLegacyPasswordHasher.LEGACY_HASH_PATTERN)) {
            return VerificationResult.failed();
        }

        final String formattedRegisteredAt =
                registeredAt == null ? "" : BCryptWithLegacyPasswordHasher.LEGACY_TIME_FORMAT.format(registeredAt);
        final String legacy = BCryptWithLegacyPasswordHasher.legacyHash(
                rawPassword, formattedRegisteredAt, passwordKey == null ? "" : passwordKey);
        return MessageDigest.isEqual(
                        legacy.getBytes(StandardCharsets.UTF_8), storedHash.getBytes(StandardCharsets.UTF_8))
                ? VerificationResult.legacy()
                : VerificationResult.failed();
    }

    /**
     * 复刻 PHP 版 {@code md5(sha1($password . $reg_datetime) . $password_key)}。
     *
     * <p>PHP 的 {@code sha1()} 默认返回小写十六进制字符串（不是原始字节），
     * 拼接与外层 md5 都作用在这个字符串上——照抄成字节数组会算出完全不同的值。
     */
    private static String legacyHash(final String rawPassword, final String registeredAt, final String passwordKey) {
        final String sha1Hex = BCryptWithLegacyPasswordHasher.hexDigest("SHA-1", rawPassword + registeredAt);
        return BCryptWithLegacyPasswordHasher.hexDigest("MD5", sha1Hex + passwordKey);
    }

    private static String hexDigest(final String algorithm, final String input) {
        try {
            final MessageDigest digest = MessageDigest.getInstance(algorithm);
            return HexFormat.of().formatHex(digest.digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException error) {
            throw new IllegalStateException(algorithm + " 必须由 JDK 提供", error);
        }
    }
}
