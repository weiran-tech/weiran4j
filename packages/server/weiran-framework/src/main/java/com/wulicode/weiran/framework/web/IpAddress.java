package com.wulicode.weiran.framework.web;

import java.net.InetAddress;
import java.net.UnknownHostException;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;

/** 只解析字面量，不接受 DNS、端口或 zone id。 */
final class IpAddress {
    private static final Pattern IPV6 = Pattern.compile("[0-9a-fA-F:.]+");
    private static final Pattern OCTET = Pattern.compile("0|[1-9][0-9]{0,2}");

    private IpAddress() {}

    static @Nullable InetAddress parse(final @Nullable String value) {
        if (value == null || value.isEmpty() || value.length() > 45) {
            return null;
        }
        if (!value.contains(":")) {
            if (!IpAddress.isIpv4(value)) {
                return null;
            }
        } else {
            if (!IpAddress.IPV6.matcher(value).matches()) {
                return null;
            }
            if (value.contains(".") && !IpAddress.isIpv4(value.substring(value.lastIndexOf(':') + 1))) {
                return null;
            }
        }
        try {
            // IPv4 已严格校验，IPv6 仅有十六进制、冒号和可选 IPv4 尾部，不可能进入主机名解析。
            return InetAddress.getByName(value);
        } catch (final UnknownHostException ignored) {
            return null;
        }
    }

    private static boolean isIpv4(final String value) {
        final String[] octets = value.split("\\.", -1);
        if (octets.length != 4) {
            return false;
        }
        for (final String octet : octets) {
            if (!IpAddress.OCTET.matcher(octet).matches() || Integer.parseInt(octet) > 255) {
                return false;
            }
        }
        return true;
    }
}
