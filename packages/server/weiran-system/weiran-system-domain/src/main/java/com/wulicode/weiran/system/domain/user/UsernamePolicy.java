package com.wulicode.weiran.system.domain.user;

import java.util.regex.Pattern;

/** 本地用户名的写入规则；历史用户名可继续读取和登录。 */
public final class UsernamePolicy {

    public static final String PATTERN = "[a-z0-9_]{2,32}";

    private static final Pattern VALID = Pattern.compile(UsernamePolicy.PATTERN);

    private UsernamePolicy() {}

    public static boolean isValid(final String username) {
        return UsernamePolicy.VALID.matcher(username).matches();
    }
}
