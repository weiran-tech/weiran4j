package com.weiran.system.infrastructure.identity;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.weiran.system.domain.identity.SsoMode;
import com.weiran.system.domain.identity.SsoState;
import com.weiran.system.domain.identity.SsoStateSigner;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import lombok.extern.slf4j.Slf4j;

/**
 * 流程状态签名：{@code base64url(JSON) + "." + base64url(HMAC-SHA256)}。
 *
 * <p>密钥由 JWT 密钥派生（{@code HMAC(jwtSecret, "weiran-sso-state")}），不与令牌签名共用同一把：
 * 流程 Cookie 永远不可能被当成令牌，反之亦然。只签名不加密——里面的 state / nonce / verifier 都是一次性随机值，
 * Cookie 本身 HttpOnly，且回调完成后立即清除。
 */
@Slf4j
public final class HmacSsoStateSigner implements SsoStateSigner {

    private static final String ALGORITHM = "HmacSHA256";

    private static final String KEY_LABEL = "weiran-sso-state";

    private static final Base64.Encoder ENCODER = Base64.getUrlEncoder().withoutPadding();

    private static final Base64.Decoder DECODER = Base64.getUrlDecoder();

    private final SecretKeySpec key;

    private final ObjectMapper objectMapper;

    /**
     * 构造签名器。
     *
     * @param jwtSecret {@code weiran.auth.jwt.secret}（启动时已校验 ≥ 32 字节）
     */
    public HmacSsoStateSigner(final String jwtSecret, final ObjectMapper objectMapper) {
        this.key = new SecretKeySpec(
                HmacSsoStateSigner.hmac(
                        new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), ALGORITHM),
                        KEY_LABEL.getBytes(StandardCharsets.UTF_8)),
                ALGORITHM);
        this.objectMapper = objectMapper;
    }

    @Override
    public String sign(final SsoState state) {
        final ObjectNode json = this.objectMapper.createObjectNode();
        json.put("p", state.provider());
        json.put("s", state.state());
        json.put("n", state.nonce());
        json.put("v", state.codeVerifier());
        json.put("r", state.redirect());
        json.put("m", state.mode().name());
        final Long bindUserId = state.bindUserId();
        if (bindUserId != null) {
            json.put("u", bindUserId.longValue());
        }
        json.put("e", state.expiresAt().getEpochSecond());
        final String payload;
        try {
            payload = ENCODER.encodeToString(this.objectMapper.writeValueAsBytes(json));
        } catch (final IOException ex) {
            throw new IllegalStateException("流程状态序列化失败", ex);
        }
        return payload + "."
                + ENCODER.encodeToString(
                        HmacSsoStateSigner.hmac(this.key, payload.getBytes(StandardCharsets.US_ASCII)));
    }

    @Override
    public Optional<SsoState> verify(final String signed, final Instant now) {
        final int dot = signed.indexOf('.');
        if (dot <= 0 || dot == signed.length() - 1) {
            return Optional.empty();
        }
        final String payload = signed.substring(0, dot);
        try {
            final byte[] expected = HmacSsoStateSigner.hmac(this.key, payload.getBytes(StandardCharsets.US_ASCII));
            if (!MessageDigest.isEqual(expected, DECODER.decode(signed.substring(dot + 1)))) {
                return Optional.empty();
            }
            final JsonNode json = this.objectMapper.readTree(DECODER.decode(payload));
            final Instant expiresAt = Instant.ofEpochSecond(json.path("e").asLong());
            if (!now.isBefore(expiresAt)) {
                return Optional.empty();
            }
            final JsonNode bind = json.get("u");
            return Optional.of(new SsoState(
                    json.path("p").asText(),
                    json.path("s").asText(),
                    json.path("n").asText(),
                    json.path("v").asText(),
                    json.path("r").asText(),
                    SsoMode.valueOf(json.path("m").asText()),
                    bind == null || !bind.canConvertToLong() ? null : bind.asLong(),
                    expiresAt));
        } catch (final IOException | IllegalArgumentException ex) {
            // 不记 Cookie 原文（宪法 CP-9）。
            HmacSsoStateSigner.log.debug("流程状态无法解析: {}", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }

    private static byte[] hmac(final SecretKeySpec key, final byte[] data) {
        try {
            final Mac mac = Mac.getInstance(ALGORITHM);
            mac.init(key);
            return mac.doFinal(data);
        } catch (final GeneralSecurityException ex) {
            throw new IllegalStateException("JDK 缺少 " + ALGORITHM, ex);
        }
    }
}
