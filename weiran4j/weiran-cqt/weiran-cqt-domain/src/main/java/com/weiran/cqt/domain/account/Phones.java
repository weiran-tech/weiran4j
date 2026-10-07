package com.weiran.cqt.domain.account;

import com.weiran.framework.error.BizException;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** 手机号规则。 */
public final class Phones {

    private static final Pattern MOBILE = Pattern.compile("\\d{11}");

    private Phones() {}

    /** 校验并返回去掉首尾空白的手机号：必须是 11 位数字。 */
    public static String require(final @Nullable String raw) {
        final String phone = raw == null ? "" : raw.strip();
        if (!Phones.MOBILE.matcher(phone).matches()) {
            throw BizException.badRequest("手机号格式不正确");
        }
        return phone;
    }

    /** 日志用掩码：保留前 3 位与后 4 位（如 {@code 155****6215}）；长度不足 7 位时整体打码。 */
    public static String mask(final String phone) {
        if (phone.length() < 7) {
            return "****";
        }
        return phone.substring(0, 3) + "****" + phone.substring(phone.length() - 4);
    }
}
