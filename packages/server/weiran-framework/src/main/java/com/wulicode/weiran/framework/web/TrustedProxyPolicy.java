package com.wulicode.weiran.framework.web;

import jakarta.servlet.http.HttpServletRequest;
import java.net.InetAddress;
import java.util.Enumeration;
import java.util.List;

/** 从 socket 对端开始，从右到左剥离可信代理，绝不根据来访声明扩大信任范围。 */
public final class TrustedProxyPolicy {
    private static final int MAX_HEADER_LENGTH = 4096;
    private static final int MAX_HOPS = 32;
    private final List<Range> ranges;

    public TrustedProxyPolicy(final TrustedProxyProperties properties) {
        this.ranges = properties.trustedProxies().stream().map(Range::parse).toList();
    }

    public String resolve(final HttpServletRequest request) {
        final String peer = ClientIpResolver.directPeer(request);
        final InetAddress address = IpAddress.parse(peer);
        if (address == null || !this.isTrusted(address)) {
            return peer;
        }
        final Enumeration<String> forwarded = request.getHeaders("X-Forwarded-For");
        if (!forwarded.hasMoreElements()) {
            return TrustedProxyPolicy.realIp(request, peer);
        }
        final String header = forwarded.nextElement();
        if (forwarded.hasMoreElements() || header.length() > TrustedProxyPolicy.MAX_HEADER_LENGTH) {
            return peer;
        }
        final String[] hops = header.split(",", -1);
        if (hops.length > TrustedProxyPolicy.MAX_HOPS) {
            return peer;
        }
        String result = peer;
        for (int index = hops.length - 1; index >= 0; index--) {
            final InetAddress hop = IpAddress.parse(hops[index].trim());
            if (hop == null) {
                return peer;
            }
            result = hop.getHostAddress();
            if (!this.isTrusted(hop)) {
                return result;
            }
        }
        return result;
    }

    private boolean isTrusted(final InetAddress address) {
        return this.ranges.stream().anyMatch(range -> range.contains(address));
    }

    private static String realIp(final HttpServletRequest request, final String peer) {
        final Enumeration<String> headers = request.getHeaders("X-Real-IP");
        if (!headers.hasMoreElements()) {
            return peer;
        }
        final String header = headers.nextElement();
        if (headers.hasMoreElements() || header.length() > TrustedProxyPolicy.MAX_HEADER_LENGTH) {
            return peer;
        }
        final InetAddress real = IpAddress.parse(header.trim());
        return real == null ? peer : real.getHostAddress();
    }

    private static final class Range {
        private final byte[] network;
        private final int prefix;

        private Range(final byte[] network, final int prefix) {
            this.network = network.clone();
            this.prefix = prefix;
        }

        static Range parse(final String entry) {
            final String[] parts = entry.trim().split("/", -1);
            final InetAddress address = IpAddress.parse(parts[0]);
            if (address == null || parts.length > 2) {
                throw Range.invalid();
            }
            final byte[] bytes = address.getAddress();
            final boolean mapped = parts[0].contains(":") && bytes.length == 4;
            final int width = mapped ? 128 : bytes.length * 8;
            int prefix = width;
            if (parts.length == 2) {
                if (!parts[1].matches("0|[1-9][0-9]{0,2}")) {
                    throw Range.invalid();
                }
                prefix = Integer.parseInt(parts[1]);
            }
            if (prefix > width || (mapped && prefix < 96)) {
                throw Range.invalid();
            }
            return new Range(bytes, mapped ? prefix - 96 : prefix);
        }

        boolean contains(final InetAddress address) {
            final byte[] candidate = address.getAddress();
            if (candidate.length != this.network.length) {
                return false;
            }
            for (int index = 0; index < this.network.length; index++) {
                final int bits = Math.min(8, Math.max(0, this.prefix - index * 8));
                final int mask = (0xff << (8 - bits)) & 0xff;
                if ((candidate[index] & mask) != (this.network[index] & mask)) {
                    return false;
                }
            }
            return true;
        }

        private static IllegalArgumentException invalid() {
            return new IllegalArgumentException(
                    "weiran.web.trusted-proxies 必须为合法 IPv4/IPv6 或 CIDR，mapped IPv6 前缀须为 96～128");
        }
    }
}
