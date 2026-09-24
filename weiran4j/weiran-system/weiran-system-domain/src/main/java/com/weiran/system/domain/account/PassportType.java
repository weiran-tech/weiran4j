package com.weiran.system.domain.account;

import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/**
 * 通行证类型：登录标识既可以是用户名、手机号，也可以是邮箱。
 *
 * <p>PHP 侧由 {@code PamAccount::passportType()} 在运行时嗅探，这里把嗅探规则显式化，
 * 避免「同一个字符串在两处被判成不同类型」这类只在生产才暴露的分歧。
 */
public enum PassportType {
    /** 用户名。 */
    USERNAME,

    /** 手机号。 */
    MOBILE,

    /** 邮箱。 */
    EMAIL;

    private static final Pattern MOBILE_PATTERN = Pattern.compile("^1[3-9]\\d{9}$");

    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^@\\s]+@[^@\\s.]+\\.[^@\\s]+$");

    /**
     * 按内容嗅探通行证类型。
     *
     * <p>判定顺序固定：邮箱含 {@code @} 最容易区分，其次手机号形态，其余归为用户名。
     * 入参允许为 null：上游可能拿到缺失的表单字段，这里按用户名处理并交给后续校验报错，
     * 而不是在嗅探阶段抛 NPE。
     */
    public static PassportType detect(final @Nullable String passport) {
        final String trimmed = passport == null ? "" : passport.trim();
        if (PassportType.EMAIL_PATTERN.matcher(trimmed).matches()) {
            return PassportType.EMAIL;
        }
        if (PassportType.MOBILE_PATTERN.matcher(trimmed).matches()) {
            return PassportType.MOBILE;
        }
        return PassportType.USERNAME;
    }
}
