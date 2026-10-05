package com.weiran.system.infrastructure.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.VerifiedToken;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class JwtTokenCodecTest {

    private static final String SECRET = "unit-test-secret-key-at-least-32-bytes!";

    private static JwtTokenCodec codec(final String secret, final Duration ttl, final Clock clock) {
        return new JwtTokenCodec(new AuthJwtProperties(secret, ttl, "weiran4j", "weiran4j"), clock);
    }

    private static JwtTokenCodec codec() {
        return JwtTokenCodecTest.codec(JwtTokenCodecTest.SECRET, Duration.ofHours(12), Clock.systemUTC());
    }

    /** 用同一密钥手工签发，用来构造 iss / aud 不合规的令牌。 */
    private static String sign(final Map<String, Object> claims) {
        return Jwts.builder()
                .claims(claims)
                .signWith(Keys.hmacShaKeyFor(JwtTokenCodecTest.SECRET.getBytes(StandardCharsets.UTF_8)))
                .compact();
    }

    @Test
    @DisplayName("密钥缺失或不足 32 字节、签发方或受众为空时构造失败（应用启动失败），提示语用新配置键")
    void rejectsInvalidProperties() {
        assertThatThrownBy(() -> JwtTokenCodecTest.codec("", Duration.ofHours(12), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32")
                .hasMessageContaining("weiran.auth.jwt.secret");
        assertThatThrownBy(() -> JwtTokenCodecTest.codec("x".repeat(31), Duration.ofHours(12), Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtTokenCodec(
                        new AuthJwtProperties(JwtTokenCodecTest.SECRET, Duration.ofHours(1), " ", "weiran4j"),
                        Clock.systemUTC()))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    @DisplayName("签发的令牌带 iss / aud，校验后得到签发方、主体与令牌版本")
    void roundTrip() throws Exception {
        final JwtTokenCodec codec = JwtTokenCodecTest.codec();

        final String token = codec.issue(new TokenClaims(7L, "zhangsan", 3));

        assertThat(codec.verify(token)).contains(new VerifiedToken("weiran4j", "7", 3));
        assertThat(codec.issuer()).isEqualTo("weiran4j");
        assertThat(codec.ttl()).isEqualTo(Duration.ofHours(12));
        final Map<?, ?> payload =
                new ObjectMapper().readValue(Base64.getUrlDecoder().decode(token.split("\\.", -1)[1]), Map.class);
        assertThat(payload.get("iss")).isEqualTo("weiran4j");
        assertThat(payload.get("aud")).isEqualTo(List.of("weiran4j"));
    }

    @Test
    @DisplayName("篡改、换密钥签发或已过期的令牌校验为空")
    void rejectsInvalidTokens() {
        final JwtTokenCodec codec =
                JwtTokenCodecTest.codec(JwtTokenCodecTest.SECRET, Duration.ofHours(1), Clock.systemUTC());
        final String token = codec.issue(new TokenClaims(1L, "admin", 0));

        assertThat(codec.verify(token + "x")).isEmpty();
        assertThat(codec.verify("not-a-jwt")).isEmpty();
        final JwtTokenCodec other = JwtTokenCodecTest.codec(
                "another-secret-key-that-is-long-enough!", Duration.ofHours(1), Clock.systemUTC());
        assertThat(other.verify(token)).isEmpty();

        final Clock past = Clock.fixed(Instant.parse("2020-01-01T00:00:00Z"), ZoneOffset.UTC);
        final JwtTokenCodec expiredIssuer =
                JwtTokenCodecTest.codec(JwtTokenCodecTest.SECRET, Duration.ofMinutes(1), past);
        assertThat(codec.verify(expiredIssuer.issue(new TokenClaims(1L, "admin", 0))))
                .isEmpty();
    }

    @Test
    @DisplayName("同一密钥签发、但 iss 缺失或不符、aud 不符的令牌校验为空")
    void rejectsWrongIssuerOrAudience() {
        final JwtTokenCodec codec = JwtTokenCodecTest.codec();
        final long exp = Instant.now().plusSeconds(600).getEpochSecond();

        assertThat(codec.verify(JwtTokenCodecTest.sign(Map.of("sub", "1", "ver", 0, "aud", "weiran4j", "exp", exp))))
                .isEmpty();
        assertThat(codec.verify(JwtTokenCodecTest.sign(
                        Map.of("sub", "1", "ver", 0, "iss", "other", "aud", "weiran4j", "exp", exp))))
                .isEmpty();
        assertThat(codec.verify(JwtTokenCodecTest.sign(
                        Map.of("sub", "1", "ver", 0, "iss", "weiran4j", "aud", "other", "exp", exp))))
                .isEmpty();
        assertThat(codec.verify(JwtTokenCodecTest.sign(
                        Map.of("sub", "1", "ver", 0, "iss", "weiran4j", "aud", "weiran4j", "exp", exp))))
                .contains(new VerifiedToken("weiran4j", "1", 0));
    }

    @Test
    @DisplayName("读签发方不验签：合法 JWT 读出 iss，非 JWT、载荷损坏或没有 iss 时为空")
    void readsIssuerWithoutVerifying() {
        final JwtIssuerReader reader = new JwtIssuerReader(new ObjectMapper());
        final String token = JwtTokenCodecTest.codec().issue(new TokenClaims(1L, "admin", 0));

        assertThat(reader.issuerOf(token)).contains("weiran4j");
        assertThat(reader.issuerOf("not-a-jwt")).isEmpty();
        assertThat(reader.issuerOf("a.@@@.b")).isEmpty();
        assertThat(reader.issuerOf(
                        "a." + Base64.getUrlEncoder().encodeToString("{\"sub\":\"1\"}".getBytes(StandardCharsets.UTF_8))
                                + ".b"))
                .isEmpty();
        assertThat(reader.issuerOf(
                        "a." + Base64.getUrlEncoder().encodeToString("[1]".getBytes(StandardCharsets.UTF_8)) + ".b"))
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
