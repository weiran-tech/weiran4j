package com.weiran.cqt.domain.account;

import com.weiran.common.error.BizException;
import java.text.Normalizer;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.format.ResolverStyle;
import java.util.Locale;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** 证件号规则：规范化与校验（口径沿用原系统 {@code drama.py} 的 {@code normalize_credential}）。 */
public final class Credentials {

    /** 其他证件号的最大长度。 */
    static final int OTHER_MAX_LENGTH = 200;

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private static final Pattern ID_CARD = Pattern.compile("\\d{17}[\\dX]");

    private static final int[] ID_WEIGHTS = {7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2};

    private static final String ID_CHECK_CODES = "10X98765432";

    private static final DateTimeFormatter BIRTHDAY =
            DateTimeFormatter.ofPattern("uuuuMMdd", Locale.ROOT).withResolverStyle(ResolverStyle.STRICT);

    private static final int MIN_BIRTH_YEAR = 1900;

    private Credentials() {}

    /** 规范化：全角转半角（NFKC）、去掉全部空白、转大写。 */
    public static String normalize(final @Nullable String raw) {
        if (raw == null) {
            return "";
        }
        final String nfkc = Normalizer.normalize(raw, Normalizer.Form.NFKC);
        return Credentials.WHITESPACE.matcher(nfkc).replaceAll("").toUpperCase(Locale.ROOT);
    }

    /**
     * 规范化并按类型校验证件号。
     *
     * @param type 证件类型
     * @param raw 原始输入
     * @param today 今天（判断出生日期是否晚于今天）
     * @return 规范化后的证件号
     */
    public static String requireValid(final CredentialType type, final @Nullable String raw, final LocalDate today) {
        final String value = Credentials.normalize(raw);
        if (value.isEmpty()) {
            throw BizException.badRequest("证件号不能为空");
        }
        if (type == CredentialType.OTHER) {
            if (value.length() > Credentials.OTHER_MAX_LENGTH) {
                throw BizException.badRequest("其他证件号不能超过200个字符");
            }
            return value;
        }
        if (!Credentials.ID_CARD.matcher(value).matches()) {
            throw BizException.badRequest("身份证号必须是18位有效号码");
        }
        final LocalDate birthday;
        try {
            birthday = LocalDate.parse(value.substring(6, 14), Credentials.BIRTHDAY);
        } catch (final DateTimeParseException ex) {
            throw BizException.badRequest("身份证号出生日期无效");
        }
        if (birthday.isAfter(today) || birthday.getYear() < Credentials.MIN_BIRTH_YEAR) {
            throw BizException.badRequest("身份证号出生日期超出合理范围");
        }
        int sum = 0;
        for (int i = 0; i < Credentials.ID_WEIGHTS.length; i++) {
            sum += (value.charAt(i) - '0') * Credentials.ID_WEIGHTS[i];
        }
        if (value.charAt(17) != Credentials.ID_CHECK_CODES.charAt(sum % 11)) {
            throw BizException.badRequest("身份证号校验位错误");
        }
        return value;
    }
}
