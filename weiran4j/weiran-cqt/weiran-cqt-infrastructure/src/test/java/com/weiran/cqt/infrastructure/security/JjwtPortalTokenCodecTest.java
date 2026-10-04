package com.weiran.cqt.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.weiran.cqt.domain.portal.PortalTokenClaims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JjwtPortalTokenCodecTest {

    private static final String SECRET = "unit-test-portal-secret-at-least-32-bytes";

    private static final Instant NOW = Instant.parse("2026-10-02T00:00:00Z");

    private static JjwtPortalTokenCodec codecAt(final Instant now) {
        return new JjwtPortalTokenCodec(
                JjwtPortalTokenCodecTest.SECRET, Duration.ofHours(1), Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    @DisplayName("签发后可解析回账号 ID 与令牌版本")
    void roundTrip() {
        final JjwtPortalTokenCodec codec = JjwtPortalTokenCodecTest.codecAt(JjwtPortalTokenCodecTest.NOW);

        assertThat(codec.parse(codec.issue(42L, 3))).contains(new PortalTokenClaims(42L, 3));
        assertThat(codec.ttl()).isEqualTo(Duration.ofHours(1));
    }

    @Test
    @DisplayName("过期令牌无效")
    void rejectsExpired() {
        final String token =
                JjwtPortalTokenCodecTest.codecAt(JjwtPortalTokenCodecTest.NOW).issue(42L, 0);

        assertThat(JjwtPortalTokenCodecTest.codecAt(JjwtPortalTokenCodecTest.NOW.plus(Duration.ofHours(2)))
                        .parse(token))
                .isEmpty();
    }

    @Test
    @DisplayName("签名正确但 typ 不是 cqt-web、缺 typ 或缺 ver 的令牌无效")
    void rejectsWrongTypeOrMissingVersion() {
        final var key = Keys.hmacShaKeyFor(JjwtPortalTokenCodecTest.SECRET.getBytes(StandardCharsets.UTF_8));
        final String otherType = Jwts.builder()
                .subject("42")
                .claim("typ", "admin")
                .claim("ver", 0)
                .signWith(key)
                .compact();
        final String noType =
                Jwts.builder().subject("42").claim("ver", 0).signWith(key).compact();
        final String noVersion = Jwts.builder()
                .subject("42")
                .claim("typ", "cqt-web")
                .signWith(key)
                .compact();
        final JjwtPortalTokenCodec codec = JjwtPortalTokenCodecTest.codecAt(Instant.now());

        assertThat(codec.parse(otherType)).isEmpty();
        assertThat(codec.parse(noType)).isEmpty();
        assertThat(codec.parse(noVersion)).isEmpty();
    }

    @Test
    @DisplayName("签名不符或格式错误的令牌无效")
    void rejectsForeignOrGarbage() {
        final JjwtPortalTokenCodec other = new JjwtPortalTokenCodec(
                "another-portal-secret-at-least-32-bytes!!", Duration.ofHours(1), Clock.systemUTC());
        final JjwtPortalTokenCodec codec = JjwtPortalTokenCodecTest.codecAt(Instant.now());

        assertThat(codec.parse(other.issue(42L, 0))).isEmpty();
        assertThat(codec.parse("not-a-jwt")).isEmpty();
    }

    @Test
    @DisplayName("密钥缺失或不足 32 字节时构造失败，提示环境变量名")
    void rejectsShortSecret() {
        assertThatThrownBy(() -> new JjwtPortalTokenCodec("x".repeat(31), Duration.ofHours(1), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("WEIRAN_CQT_JWT_SECRET");
    }
}
