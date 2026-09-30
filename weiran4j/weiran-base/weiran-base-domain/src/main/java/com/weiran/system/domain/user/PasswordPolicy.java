package com.weiran.system.domain.user;

import com.weiran.common.error.BizException;

/**
 * 密码强度策略：8–64 位，且同时包含字母与数字。
 *
 * <p>只校验明文；哈希算法在 {@link PasswordHasher} 后面，与策略无关。
 */
public final class PasswordPolicy {

    /** 最小长度。 */
    public static final int MIN_LENGTH = 8;

    /** 最大长度（BCrypt 只取前 72 字节，64 个字符以内能保证多字节字符也不被截断得过多）。 */
    public static final int MAX_LENGTH = 64;

    /** 不满足策略时的提示语。 */
    public static final String MESSAGE = "密码长度需为 8–64 位，且同时包含字母与数字";

    private PasswordPolicy() {}

    /** 校验明文密码，不满足时抛 40000。 */
    public static void validate(final String field, final String rawPassword) {
        if (!PasswordPolicy.isAcceptable(rawPassword)) {
            throw BizException.badRequest(field + ": " + PasswordPolicy.MESSAGE);
        }
    }

    /** 明文密码是否满足策略。 */
    public static boolean isAcceptable(final String rawPassword) {
        final int length = rawPassword.length();
        if (length < PasswordPolicy.MIN_LENGTH || length > PasswordPolicy.MAX_LENGTH) {
            return false;
        }
        boolean hasLetter = false;
        boolean hasDigit = false;
        for (int i = 0; i < length; i++) {
            final char ch = rawPassword.charAt(i);
            hasLetter |= (ch >= 'a' && ch <= 'z') || (ch >= 'A' && ch <= 'Z');
            hasDigit |= ch >= '0' && ch <= '9';
        }
        return hasLetter && hasDigit;
    }
}
