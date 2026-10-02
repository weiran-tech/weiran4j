package com.weiran.cqt.adapter.portal;

import java.util.OptionalLong;
import org.jspecify.annotations.Nullable;

/** 当前请求的前台账号（由 {@link PortalAuthInterceptor} 写入，请求结束清除）。 */
public final class PortalAccount {

    private static final ThreadLocal<@Nullable Long> HOLDER = new ThreadLocal<>();

    private PortalAccount() {}

    /** 当前账号 ID；未登录（公开接口无令牌）时为空。 */
    public static OptionalLong current() {
        final Long accountId = PortalAccount.HOLDER.get();
        return accountId == null ? OptionalLong.empty() : OptionalLong.of(accountId);
    }

    static void set(final long accountId) {
        PortalAccount.HOLDER.set(accountId);
    }

    static void clear() {
        PortalAccount.HOLDER.remove();
    }
}
