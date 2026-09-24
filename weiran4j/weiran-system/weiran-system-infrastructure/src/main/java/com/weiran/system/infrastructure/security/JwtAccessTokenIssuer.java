package com.weiran.system.infrastructure.security;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.kjs.wuli3.core.time.ClockProvider;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.port.AccessTokenIssuer;
import de.thetaphi.forbiddenapis.SuppressForbidden;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.InitializingBean;

/**
 * 基于 JJWT 的 HMAC-SHA256 令牌实现。
 *
 * <p>载荷刻意最小：{@code sub}（账号 ID）、{@code typ}（账号类型）、{@code stp}（密码指纹）。
 * 不放角色与权限——JWT 是自包含且不可撤销的，把授权快照写进去意味着改权限要等到令牌过期才生效；
 * 授权在每次请求时按账号现查（见 {@code AuthApplicationService#authorize}）。
 */
@Slf4j
public final class JwtAccessTokenIssuer implements AccessTokenIssuer, InitializingBean {

    /** HMAC-SHA256 要求的最小密钥长度（字节）。 */
    public static final int MIN_SECRET_BYTES = 32;

    private static final String CLAIM_ACCOUNT_TYPE = "typ";

    private static final String CLAIM_STAMP = "stp";

    private final JwtProperties properties;

    private final ClockProvider clockProvider;

    private SecretKey signingKey = JwtAccessTokenIssuer.placeholderKey();

    /** 构造签发器；密钥校验推迟到 {@link #afterPropertiesSet()}，以便配置绑定后一次性报错。 */
    public JwtAccessTokenIssuer(final JwtProperties properties, final ClockProvider clockProvider) {
        this.properties = properties;
        this.clockProvider = clockProvider;
    }

    @Override
    public void afterPropertiesSet() {
        final byte[] secret = this.properties.getSecret().getBytes(StandardCharsets.UTF_8);
        if (secret.length < JwtAccessTokenIssuer.MIN_SECRET_BYTES) {
            throw new IllegalStateException("weiran.system.jwt.secret 至少需要 " + JwtAccessTokenIssuer.MIN_SECRET_BYTES
                    + " 字节，当前 " + secret.length + " 字节");
        }
        this.signingKey = Keys.hmacShaKeyFor(secret);
    }

    // JJWT 0.13.0 的 issuedAt / expiration 只有 java.util.Date 重载（已核对 ClaimsMutator 字节码），
    // 没有 Instant 版本。仓内时间一律用 java.time，这里是唯一的转换边界，因此就地豁免——
    // 豁免范围小到一个方法，而不是给整个模块关掉 Forbidden APIs。
    @Override
    @SuppressForbidden
    public IssuedToken issue(final long accountId, final String accountType, final String stamp) {
        final Duration ttl = this.properties.getTtl();
        final Instant issuedAt = this.clockProvider.instant();

        final String token = Jwts.builder()
                .issuer(this.properties.getIssuer())
                .subject(String.valueOf(accountId))
                .claim(JwtAccessTokenIssuer.CLAIM_ACCOUNT_TYPE, accountType)
                .claim(JwtAccessTokenIssuer.CLAIM_STAMP, stamp)
                .issuedAt(Date.from(issuedAt))
                .expiration(Date.from(issuedAt.plus(ttl)))
                .signWith(this.signingKey)
                .compact();

        return new IssuedToken(token, ttl);
    }

    @Override
    public TokenPayload parse(final String token) {
        try {
            final Claims claims = Jwts.parser()
                    .verifyWith(this.signingKey)
                    .requireIssuer(this.properties.getIssuer())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();

            // getSubject() 的内容来自令牌，parseLong 可能抛 NumberFormatException；
            // 它是 IllegalArgumentException 的子类，由下面的 catch 一并归为「令牌无效」。
            return new TokenPayload(
                    Long.parseLong(claims.getSubject()),
                    claims.get(JwtAccessTokenIssuer.CLAIM_ACCOUNT_TYPE, String.class),
                    claims.get(JwtAccessTokenIssuer.CLAIM_STAMP, String.class));
        } catch (final ExpiredJwtException expired) {
            throw new ErrorCodeException(SystemErrors.TOKEN_EXPIRED, expired);
        } catch (final JwtException | IllegalArgumentException invalid) {
            // 只记 warn 且不带令牌原文：日志里出现可用令牌等于把凭据写进日志系统。
            JwtAccessTokenIssuer.log.warn("令牌解析失败: {}", invalid.getClass().getSimpleName());
            throw new ErrorCodeException(SystemErrors.TOKEN_INVALID, invalid);
        }
    }

    /**
     * 占位密钥，仅用于让字段保持非空直到配置校验通过。
     *
     * <p>它永远不会被用来签发：{@link #afterPropertiesSet()} 要么替换掉它，要么直接让容器启动失败。
     */
    private static SecretKey placeholderKey() {
        return Keys.hmacShaKeyFor(new byte[JwtAccessTokenIssuer.MIN_SECRET_BYTES]);
    }
}
