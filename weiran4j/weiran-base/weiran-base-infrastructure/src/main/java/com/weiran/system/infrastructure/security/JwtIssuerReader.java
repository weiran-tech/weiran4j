package com.weiran.system.infrastructure.security;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.weiran.system.domain.auth.TokenIssuerReader;
import java.io.IOException;
import java.util.Base64;
import java.util.Optional;
import lombok.extern.slf4j.Slf4j;

/**
 * 从 JWT 载荷里读出 {@code iss}，<b>不验签</b>：结果只用来挑选校验器，真正的校验由对应的 {@code TokenVerifier} 完成。
 */
@Slf4j
public final class JwtIssuerReader implements TokenIssuerReader {

    private static final int JWS_PARTS = 3;

    private final ObjectMapper objectMapper;

    /** 构造读取器。 */
    public JwtIssuerReader(final ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @Override
    public Optional<String> issuerOf(final String token) {
        final String[] parts = token.split("\\.", -1);
        if (parts.length != JwtIssuerReader.JWS_PARTS || parts[1].isEmpty()) {
            return Optional.empty();
        }
        try {
            final JsonNode payload =
                    this.objectMapper.readTree(Base64.getUrlDecoder().decode(parts[1]));
            final JsonNode issuer = payload == null ? null : payload.get("iss");
            return issuer != null && issuer.isTextual() && !issuer.asText().isEmpty()
                    ? Optional.of(issuer.asText())
                    : Optional.empty();
        } catch (final IOException | IllegalArgumentException ex) {
            // 不带令牌原文（宪法 CP-9）。
            JwtIssuerReader.log.debug("令牌载荷无法解析: {}", ex.getClass().getSimpleName());
            return Optional.empty();
        }
    }
}
