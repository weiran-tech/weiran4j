package com.weiran.cqt.domain.account;

import com.weiran.framework.error.BizException;
import java.text.Normalizer;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/** 个人账号的证件类型。 */
public enum CredentialType {

    /** 居民身份证，按 18 位号码规则校验。 */
    ID_CARD("身份证号"),

    /** 其他证件，只限长度。 */
    OTHER("其他");

    private final String label;

    CredentialType(final String label) {
        this.label = label;
    }

    /** 前台展示名（uniapp 的 {@code credential_type} 取值）。 */
    public String label() {
        return this.label;
    }

    /**
     * 解析前台传入的证件类型：「身份证号」「身份证」{@code ID_CARD} → 身份证；「其他」{@code OTHER} → 其他；空值视为身份证。
     */
    public static CredentialType parse(final @Nullable String raw) {
        final String value = raw == null
                ? ""
                : Normalizer.normalize(raw, Normalizer.Form.NFKC).strip().toUpperCase(Locale.ROOT);
        return switch (value) {
            case "", "身份证号", "身份证", "ID_CARD" -> CredentialType.ID_CARD;
            case "其他", "OTHER" -> CredentialType.OTHER;
            default -> throw BizException.badRequest("身份类型只允许填写“身份证号”或“其他”");
        };
    }

    /** 按库中存储值解析（{@code ID_CARD} / {@code OTHER}），无法识别时视为身份证。 */
    public static CredentialType ofStored(final @Nullable String stored) {
        return "OTHER".equals(stored) ? CredentialType.OTHER : CredentialType.ID_CARD;
    }
}
