package com.wulicode.weiran.system.infrastructure.security;

import com.wulicode.weiran.system.domain.auth.TrustedDeviceTokens;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.jspecify.annotations.Nullable;

/** 带签名和版本绑定的免验设备 Cookie；密码变更或安全设置更新会使其失效。 */
public final class HmacTrustedDeviceTokens implements TrustedDeviceTokens {

    private static final String ALGORITHM = "HmacSHA256";

    private final byte[] key;

    private final Clock clock;

    private final SecureRandom random = new SecureRandom();

    public HmacTrustedDeviceTokens(final AuthJwtProperties properties, final Clock clock) {
        this.key = HmacTrustedDeviceTokens.sign(
                properties.secret().getBytes(StandardCharsets.UTF_8), "weiran-mfa-trusted-device");
        this.clock = clock;
    }

    @Override
    public String issue(final long userId, final int tokenVersion, final long settingsRevision) {
        final byte[] nonce = new byte[16];
        this.random.nextBytes(nonce);
        final String payload = userId + ":" + tokenVersion + ":" + settingsRevision + ":"
                + Instant.now(this.clock).getEpochSecond() + ":" + HmacTrustedDeviceTokens.encode(nonce);
        final String encoded = HmacTrustedDeviceTokens.encode(payload.getBytes(StandardCharsets.UTF_8));
        return encoded + "." + HmacTrustedDeviceTokens.encode(HmacTrustedDeviceTokens.sign(this.key, encoded));
    }

    @Override
    public boolean verify(
            final @Nullable String token,
            final long userId,
            final int tokenVersion,
            final long settingsRevision,
            final int rememberDays) {
        if (token == null || rememberDays <= 0 || token.length() > 256) {
            return false;
        }
        final int dot = token.indexOf('.');
        if (dot <= 0 || dot == token.length() - 1 || token.indexOf('.', dot + 1) >= 0) {
            return false;
        }
        try {
            final String payload = token.substring(0, dot);
            final byte[] signature = Base64.getUrlDecoder().decode(token.substring(dot + 1));
            if (!MessageDigest.isEqual(signature, HmacTrustedDeviceTokens.sign(this.key, payload))) {
                return false;
            }
            final String[] parts =
                    new String(Base64.getUrlDecoder().decode(payload), StandardCharsets.UTF_8).split(":", -1);
            if (parts.length != 5
                    || Long.parseLong(parts[0]) != userId
                    || Integer.parseInt(parts[1]) != tokenVersion
                    || Long.parseLong(parts[2]) != settingsRevision) {
                return false;
            }
            final Instant issuedAt = Instant.ofEpochSecond(Long.parseLong(parts[3]));
            final Instant now = Instant.now(this.clock);
            return !issuedAt.isAfter(now) && now.isBefore(issuedAt.plus(Duration.ofDays(rememberDays)));
        } catch (final IllegalArgumentException ex) {
            return false;
        }
    }

    private static byte[] sign(final byte[] key, final String value) {
        try {
            final Mac mac = Mac.getInstance(HmacTrustedDeviceTokens.ALGORITHM);
            mac.init(new SecretKeySpec(key, HmacTrustedDeviceTokens.ALGORITHM));
            return mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
        } catch (final java.security.GeneralSecurityException ex) {
            throw new IllegalStateException("JVM 缺少 HMAC-SHA256", ex);
        }
    }

    private static String encode(final byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }
}
