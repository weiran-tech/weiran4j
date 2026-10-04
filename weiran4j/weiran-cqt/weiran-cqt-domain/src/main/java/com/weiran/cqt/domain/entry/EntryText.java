package com.weiran.cqt.domain.entry;

import java.text.Normalizer;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** 前台文本规范化（同原系统 {@code normalize_text}：NFKC、连续空白合并为一个空格、去首尾空白）。 */
public final class EntryText {

    private static final Pattern WHITESPACE = Pattern.compile("\\s+");

    private EntryText() {}

    /** 规范化；null 视为空串。 */
    public static String normalize(final @Nullable Object value) {
        if (value == null) {
            return "";
        }
        final String nfkc = Normalizer.normalize(String.valueOf(value), Normalizer.Form.NFKC);
        return EntryText.WHITESPACE.matcher(nfkc).replaceAll(" ").strip();
    }
}
