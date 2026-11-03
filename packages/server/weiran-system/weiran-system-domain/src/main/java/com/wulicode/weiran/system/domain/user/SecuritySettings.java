package com.wulicode.weiran.system.domain.user;

import com.wulicode.weiran.framework.error.BizException;

/** 全局密码和手机多因素认证规则。 */
public record SecuritySettings(
        int passwordMinLength,
        int passwordMaxLength,
        boolean requireLower,
        boolean requireUpper,
        boolean requireDigit,
        boolean requireSymbol,
        boolean mfaEnabled,
        int mfaRememberDays,
        long revision) {

    public SecuritySettings {
        if (passwordMinLength < 8 || passwordMaxLength > 64 || passwordMinLength > passwordMaxLength) {
            throw BizException.badRequest("密码长度须为 8–64 位，最小值不能大于最大值");
        }
        if (!(requireLower || requireUpper || requireDigit || requireSymbol)) {
            throw BizException.badRequest("至少选择一种密码字符类型");
        }
        if (mfaRememberDays < 0 || mfaRememberDays > 30) {
            throw BizException.badRequest("多因素认证有效期须为 0–30 天");
        }
    }

    public static SecuritySettings defaults() {
        return new SecuritySettings(8, 64, true, false, true, false, false, 7, 0);
    }

    public SecuritySettings withPasswordRules(
            final int min,
            final int max,
            final boolean lower,
            final boolean upper,
            final boolean digit,
            final boolean symbol) {
        return new SecuritySettings(
                min, max, lower, upper, digit, symbol, this.mfaEnabled, this.mfaRememberDays, this.revision);
    }

    public SecuritySettings withMfa(final boolean enabled, final int rememberDays) {
        return new SecuritySettings(
                this.passwordMinLength,
                this.passwordMaxLength,
                this.requireLower,
                this.requireUpper,
                this.requireDigit,
                this.requireSymbol,
                enabled,
                rememberDays,
                this.revision);
    }
}
