package com.weiran.system.domain.account;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.common.error.WeiranErrors;
import java.util.Locale;

/**
 * 账号类型。
 *
 * <p>沿用 PHP 项目 {@code PamAccount::TYPE_*} 的取值（{@code user} / {@code backend}），
 * 保证两套系统读写同一张 {@code pam_account} 表时 {@code type} 列语义一致——迁移期这两套会并行跑。
 */
public enum AccountType {
    /** 前台用户。 */
    USER("user"),

    /** 后台管理员。 */
    BACKEND("backend");

    private final String code;

    AccountType(final String code) {
        this.code = code;
    }

    /** 返回落库取值。 */
    public String code() {
        return this.code;
    }

    /** 按落库取值解析；未知取值抛业务异常而不是返回 null。 */
    public static AccountType fromCode(final String code) {
        final String normalized = code == null ? "" : code.trim().toLowerCase(Locale.ROOT);
        for (final AccountType type : AccountType.values()) {
            if (type.code.equals(normalized)) {
                return type;
            }
        }
        throw new ErrorCodeException(WeiranErrors.INVALID_ARGUMENT, "未知的账号类型: " + code);
    }
}
