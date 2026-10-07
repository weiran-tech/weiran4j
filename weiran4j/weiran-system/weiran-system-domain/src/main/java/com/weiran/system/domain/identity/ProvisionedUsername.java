package com.weiran.system.domain.identity;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 自动开通时的本地用户名：优先用外部用户名；不符合本地规则（字母开头、字母数字与 {@code _.-}、2–32 位）时，
 * 改用 {@code <provider>_<外部标识的短哈希>}，保证同一外部身份每次得到同一个名字。
 */
public final class ProvisionedUsername {

    private static final Pattern VALID = Pattern.compile("[A-Za-z][A-Za-z0-9_.-]{1,31}");

    private static final int HASH_HEX_LENGTH = 10;

    private ProvisionedUsername() {}

    /** 计算用户名。 */
    public static String of(final String provider, final String externalId, final @Nullable String preferred) {
        if (preferred != null
                && ProvisionedUsername.VALID.matcher(preferred.strip()).matches()) {
            return preferred.strip();
        }
        final String hash = ProvisionedUsername.sha256Hex(provider + ":" + externalId)
                .substring(0, ProvisionedUsername.HASH_HEX_LENGTH);
        return provider.replace('-', '_') + "_" + hash;
    }

    private static String sha256Hex(final String value) {
        try {
            return HexFormat.of()
                    .formatHex(MessageDigest.getInstance("SHA-256").digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (final NoSuchAlgorithmException ex) {
            throw new IllegalStateException("JDK 缺少 SHA-256", ex);
        }
    }
}
