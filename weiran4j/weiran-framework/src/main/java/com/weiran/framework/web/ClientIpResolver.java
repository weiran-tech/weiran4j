package com.weiran.framework.web;

import jakarta.servlet.http.HttpServletRequest;
import java.util.Locale;
import org.jspecify.annotations.Nullable;

/**
 * 解析客户端 IP：{@code X-Forwarded-For} 的第一个 → {@code X-Real-IP} → {@code remoteAddr}。
 *
 * <p>代理头可以被客户端伪造，这里的结果只用于日志展示，不要拿来做访问控制。
 */
public final class ClientIpResolver {

    /** 结果的最大长度（与日志表 ip 列一致，IPv6 带 zone 也够用）。 */
    public static final int MAX_LENGTH = 64;

    private static final String UNKNOWN = "unknown";

    private ClientIpResolver() {}

    /** 解析客户端 IP；拿不到时返回空串。 */
    public static String resolve(final HttpServletRequest request) {
        final String forwarded = ClientIpResolver.firstUsable(request.getHeader("X-Forwarded-For"));
        if (forwarded != null) {
            return ClientIpResolver.limit(forwarded);
        }
        final String realIp = ClientIpResolver.firstUsable(request.getHeader("X-Real-IP"));
        if (realIp != null) {
            return ClientIpResolver.limit(realIp);
        }
        final String remote = request.getRemoteAddr();
        return remote == null ? "" : ClientIpResolver.limit(remote);
    }

    private static @Nullable String firstUsable(final @Nullable String header) {
        if (header == null) {
            return null;
        }
        final String first = header.split(",", -1)[0].trim();
        if (first.isEmpty() || ClientIpResolver.UNKNOWN.equals(first.toLowerCase(Locale.ROOT))) {
            return null;
        }
        return first;
    }

    private static String limit(final String ip) {
        return ip.length() <= ClientIpResolver.MAX_LENGTH ? ip : ip.substring(0, ClientIpResolver.MAX_LENGTH);
    }
}
