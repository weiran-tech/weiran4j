package com.wulicode.weiran.framework.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;

/** 日志与限流共用的 IP 入口；没有可信过滤器结果时只返回直接对端。 */
public final class ClientIpResolver {
    public static final int MAX_LENGTH = 64;
    static final String ATTRIBUTE = ClientIpResolver.class.getName() + ".trustedIp";

    private ClientIpResolver() {}

    public static String resolve(final HttpServletRequest request) {
        final Object resolved = request.getAttribute(ClientIpResolver.ATTRIBUTE);
        return resolved instanceof String ip ? ip : ClientIpResolver.directPeer(request);
    }

    static String directPeer(final HttpServletRequest request) {
        final String remote = request.getRemoteAddr();
        if (remote == null) {
            return "";
        }
        final InetAddress address = IpAddress.parse(remote);
        if (address != null) {
            return address.getHostAddress();
        }
        return remote.length() <= ClientIpResolver.MAX_LENGTH
                ? remote
                : remote.substring(0, ClientIpResolver.MAX_LENGTH);
    }
}
