package com.weiran.system.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.system.domain.auth.TokenClaims;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtTokenCodecTest {

    private static final String SECRET = "unit-test-secret-key-at-least-32-bytes!";

    @Test
    @DisplayName("密钥缺失或不足 32 字节时构造失败（应用启动失败）")
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new JwtTokenCodec("", Duration.ofHours(12), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32");
        assertThatThrownBy(() -> new JwtTokenCodec("x".repeat(31), Duration.ofHours(12), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("签发后可解析出 sub / username / ver")
    void roundTrip() {
        final JwtTokenCodec codec =
                new JwtTokenCodec(JwtTokenCodecTest.SECRET, Duration.ofHours(12), Clock.systemUTC());

        final String token = codec.issue(new TokenClaims(7L, "zhangsan", 3));

        assertThat(codec.parse(token)).contains(new TokenClaims(7L, "zhangsan", 3));
        assertThat(codec.ttl()).isEqualTo(Duration.ofHours(12));
    }

    @Test
    @DisplayName("篡改、换密钥签发或已过期的令牌解析为空")
    void rejectsInvalidTokens() {
        final JwtTokenCodec codec = new JwtTokenCodec(JwtTokenCodecTest.SECRET, Duration.ofHours(1), Clock.systemUTC());
        final String token = codec.issue(new TokenClaims(1L, "admin", 0));

        assertThat(codec.parse(token + "x")).isEmpty();
        assertThat(codec.parse("not-a-jwt")).isEmpty();
        final JwtTokenCodec other =
                new JwtTokenCodec("another-secret-key-that-is-long-enough!", Duration.ofHours(1), Clock.systemUTC());
        assertThat(other.parse(token)).isEmpty();

        final Clock past = Clock.fixed(Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC);
        final JwtTokenCodec expiredIssuer = new JwtTokenCodec(JwtTokenCodecTest.SECRET, Duration.ofMinutes(1), past);
        assertThat(codec.parse(expiredIssuer.issue(new TokenClaims(1L, "admin", 0))))
                .isEmpty();
    }

    @Test
    @DisplayName("BCrypt 哈希可校验，格式非法的哈希返回 false 而不抛异常")
    void bcrypt() {
        final BCryptPasswordHasher hasher = new BCryptPasswordHasher(4);
        final String hash = hasher.hash("admin123");

        assertThat(hasher.matches("admin123", hash)).isTrue();
        assertThat(hasher.matches("admin124", hash)).isFalse();
        assertThat(hasher.matches("admin123", "not-a-bcrypt-hash")).isFalse();
    }
}
