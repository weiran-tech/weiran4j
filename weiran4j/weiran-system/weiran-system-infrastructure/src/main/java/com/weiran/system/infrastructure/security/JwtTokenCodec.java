package com.weiran.system.infrastructure.security;

import com.weiran.system.domain.auth.TokenClaims;
import com.weiran.system.domain.auth.TokenCodec;
import de.thetaphi.forbiddenapis.SuppressForbidden;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Optional;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;

/**
 * JWT（HS256）令牌编解码。
 *
 * <p>载荷刻意最小：{@code sub}（用户 ID）、{@code username}、{@code ver}（令牌版本）。
 * 不放角色与权限——JWT 签发后不可撤销，把授权快照写进去意味着改权限要等令牌过期才生效；
 * 授权在每次请求时由 {@code TokenAuthenticator} 按用户现查。
 */
@Slf4j
public final class JwtTokenCodec implements TokenCodec {

    /** HMAC-SHA256 要求的最小密钥长度（字节）。 */
    public static final int MIN_SECRET_BYTES = 32;

    private static final String CLAIM_USERNAME = "username";

    private static final String CLAIM_VERSION = "ver";

    private final SecretKey signingKey;

    private final Duration ttl;

    private final Clock clock;

    /**
     * 构造编解码器；密钥缺失或不足 32 字节时直接抛异常，让应用启动失败。
     *
     * @param secret HS256 密钥
     * @param ttl 有效期
     * @param clock 时钟
     */
    public JwtTokenCodec(final String secret, final Duration ttl, final Clock clock) {
        final byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < JwtTokenCodec.MIN_SECRET_BYTES) {
            throw new IllegalStateException("weiran.system.jwt.secret（环境变量 WEIRAN_JWT_SECRET）至少需要 "
                    + JwtTokenCodec.MIN_SECRET_BYTES + " 字节，当前 " + bytes.length + " 字节");
        }
        this.signingKey = Keys.hmacShaKeyFor(bytes);
        this.ttl = ttl;
        this.clock = clock;
    }

    // JJWT 0.13 的 issuedAt / expiration 只有 java.util.Date 重载，没有 Instant 版本。
    // 仓内时间一律用 java.time，这里是唯一的转换边界，因此就地豁免——范围只到这一个方法。
    @Override
    @SuppressForbidden
    public String issue(final TokenClaims claims) {
        final Instant issuedAt = this.clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(claims.userId()))
                .claim(JwtTokenCodec.CLAIM_USERNAME, claims.username())
                .claim(JwtTokenCodec.CLAIM_VERSION, claims.version())
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(issuedAt.plus(this.ttl)))
                .signWith(this.signingKey)
                .compact();
    }

    // 过期判断同样走注入的 Clock（JJWT 的 Clock 只返回 java.util.Date），理由同 issue。
    @Override
    @SuppressForbidden
    public Optional<TokenClaims> parse(final String token) {
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(this.signingKey)
                    .clock(() -> Date.from(this.clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            final String subject = claims.getSubject();
            final String username = claims.get(JwtTokenCodec.CLAIM_USERNAME, String.class);
            final Integer version = claims.get(JwtTokenCodec.CLAIM_VERSION, Integer.class);
            if (subject == null || username == null || version == null) {
                return Optional.empty();
            }
            return Optional.of(new TokenClaims(Long.parseLong(subject), username, version));
        } catch (final JwtException | IllegalArgumentException ex) {
            // 只记 debug 且不带令牌原文：过期令牌是常态，日志里出现可用令牌等于把凭据写进日志系统。
            JwtTokenCodec.log.debug("令牌校验失败: {}", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    @Override
    public Duration ttl() {
        return this.ttl;
    }
}
