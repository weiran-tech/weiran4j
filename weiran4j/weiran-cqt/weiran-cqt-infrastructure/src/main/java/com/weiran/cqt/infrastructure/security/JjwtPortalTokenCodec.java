package com.weiran.cqt.infrastructure.security;

import com.weiran.cqt.domain.portal.PortalTokenCodec;
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
 * 前台账号令牌（JWT，HS256）。
 *
 * <p>载荷只有 {@code sub}（账号 ID）与 {@code typ}（固定 {@value #TOKEN_TYPE}）。{@code typ} 让前台令牌与后台令牌互斥：
 * 后台令牌没有这个声明，即使两边误配了同一把密钥也不会串用。
 *
 * <p>尚无吊销机制（载荷不带 {@code ver}）：前台账号迁入后由账号 change 补上，见 design 宪法对照 CP-8。
 */
@Slf4j
public final class JjwtPortalTokenCodec implements PortalTokenCodec {

    /** HMAC-SHA256 要求的最小密钥长度（字节）。 */
    public static final int MIN_SECRET_BYTES = 32;

    /** 前台令牌的 {@code typ} 声明值。 */
    public static final String TOKEN_TYPE = "cqt-web";

    private static final String CLAIM_TYPE = "typ";

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
    public JjwtPortalTokenCodec(final String secret, final Duration ttl, final Clock clock) {
        final byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < JjwtPortalTokenCodec.MIN_SECRET_BYTES) {
            throw new IllegalStateException("weiran.cqt.jwt.secret（环境变量 WEIRAN_CQT_JWT_SECRET）至少需要 "
                    + JjwtPortalTokenCodec.MIN_SECRET_BYTES + " 字节，当前 " + bytes.length + " 字节");
        }
        this.signingKey = Keys.hmacShaKeyFor(bytes);
        this.ttl = ttl;
        this.clock = clock;
    }

    // JJWT 0.13 的 issuedAt / expiration 只有 java.util.Date 重载；这里是唯一的转换边界，就地豁免。
    @Override
    @SuppressForbidden
    public String issue(final long accountId) {
        final Instant issuedAt = this.clock.instant();
        return Jwts.builder()
                .subject(String.valueOf(accountId))
                .claim(JjwtPortalTokenCodec.CLAIM_TYPE, JjwtPortalTokenCodec.TOKEN_TYPE)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(issuedAt.plus(this.ttl)))
                .signWith(this.signingKey)
                .compact();
    }

    // 过期判断走注入的 Clock（JJWT 的 Clock 只返回 java.util.Date），理由同 issue。
    @Override
    @SuppressForbidden
    public Optional<Long> parse(final String token) {
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(this.signingKey)
                    .clock(() -> Date.from(this.clock.instant()))
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
            final String subject = claims.getSubject();
            final String type = claims.get(JjwtPortalTokenCodec.CLAIM_TYPE, String.class);
            if (subject == null || !JjwtPortalTokenCodec.TOKEN_TYPE.equals(type)) {
                return Optional.empty();
            }
            return Optional.of(Long.parseLong(subject));
        } catch (final JwtException | IllegalArgumentException ex) {
            // 只记 debug 且不带令牌原文：过期令牌是常态，日志里出现可用令牌等于把凭据写进日志系统。
            JjwtPortalTokenCodec.log.debug("前台令牌校验失败: {}", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
