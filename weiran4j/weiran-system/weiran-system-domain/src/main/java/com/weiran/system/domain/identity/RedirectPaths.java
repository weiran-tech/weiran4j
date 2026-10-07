package com.weiran.system.domain.identity;

import org.jspecify.annotations.Nullable;

/**
 * 登录后回跳路径的规范化：只接受站内路径，防开放重定向。
 *
 * <p>合法值以单个 {@code /} 开头，且不含反斜杠与控制字符；{@code //evil.com}、{@code /\evil.com}、
 * {@code https://evil.com} 都会被浏览器当成跨站地址，一律改成首页。
 */
public final class RedirectPaths {

    /** 默认回跳地址。 */
    public static final String HOME = "/";

    private static final int MAX_LENGTH = 512;

    private RedirectPaths() {}

    /** 规范化回跳路径。 */
    public static String normalize(final @Nullable String redirect) {
        if (redirect == null || redirect.isEmpty() || redirect.length() > RedirectPaths.MAX_LENGTH) {
            return RedirectPaths.HOME;
        }
        if (redirect.charAt(0) != '/' || redirect.startsWith("//") || redirect.indexOf('\\') >= 0) {
            return RedirectPaths.HOME;
        }
        for (int i = 0; i < redirect.length(); i++) {
            if (Character.isISOControl(redirect.charAt(i))) {
                return RedirectPaths.HOME;
            }
        }
        return redirect;
    }
}
