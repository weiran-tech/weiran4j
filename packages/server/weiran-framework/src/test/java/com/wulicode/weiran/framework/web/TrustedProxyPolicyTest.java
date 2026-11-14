package com.wulicode.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatIllegalArgumentException;

import jakarta.servlet.ServletException;
import java.io.IOException;
import java.util.List;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class TrustedProxyPolicyTest {
    private final TrustedProxyPolicy policy =
            new TrustedProxyPolicy(new TrustedProxyProperties(List.of("10.0.0.0/24")));

    private static MockHttpServletRequest request(final String peer, final String header) {
        final MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr(peer);
        request.addHeader("X-Forwarded-For", header);
        return request;
    }

    @ParameterizedTest
    @ValueSource(strings = {"127.0.0.1", "10.0.0.2", "192.168.1.2", "203.0.113.7", "::1"})
    @DisplayName("默认无可信代理，包括 loopback 和私网")
    void defaultsToPeer(final String peer) {
        final MockHttpServletRequest request = TrustedProxyPolicyTest.request(peer, "192.0.2.66");
        request.addHeader("X-Real-IP", "192.0.2.88");
        request.addHeader("Forwarded", "for=192.0.2.99");
        assertThat(new TrustedProxyPolicy(new TrustedProxyProperties(List.of())).resolve(request))
                .isEqualTo(ClientIpResolver.resolve(request));
    }

    @Test
    @DisplayName("右向左定位首个不可信地址，左侧声明不再参与")
    void walksTrustedChain() {
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.0.2", "192.0.2.66, 203.0.113.7, 10.0.0.3")))
                .isEqualTo("203.0.113.7");
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.0.2", "invalid, 203.0.113.7, 10.0.0.3")))
                .isEqualTo("203.0.113.7");
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.0.2", "10.0.0.4, 10.0.0.3")))
                .isEqualTo("10.0.0.4");
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.1.2", "203.0.113.7")))
                .isEqualTo("10.0.1.2");
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "",
                "unknown",
                "203.0.113.7,",
                " ,10.0.0.3",
                "example.com",
                "2130706433",
                "127.1",
                "010.0.0.1",
                "256.0.0.1",
                "[::1]",
                "fe80::1%eth0",
                "203.0.113.7:80",
                "2001::db8::1",
                "::ffff:010.0.0.1"
            })
    @DisplayName("参与判定的非法地址安全回退，不改用 X-Real-IP")
    void rejectsInvalidHeaders(final String header) {
        final MockHttpServletRequest request = TrustedProxyPolicyTest.request("10.0.0.2", header);
        request.addHeader("X-Real-IP", "192.0.2.88");
        assertThat(this.policy.resolve(request)).isEqualTo("10.0.0.2");
    }

    @Test
    @DisplayName("拒绝重复头和超过上限的链，边界值允许")
    void boundsHeaders() {
        final MockHttpServletRequest duplicate = TrustedProxyPolicyTest.request("10.0.0.2", "203.0.113.7");
        duplicate.addHeader("X-Forwarded-For", "203.0.113.8");
        assertThat(this.policy.resolve(duplicate)).isEqualTo("10.0.0.2");
        assertThat(this.policy.resolve(
                        TrustedProxyPolicyTest.request("10.0.0.2", "10.0.0.3,".repeat(31) + "203.0.113.7")))
                .isEqualTo("203.0.113.7");
        assertThat(this.policy.resolve(
                        TrustedProxyPolicyTest.request("10.0.0.2", "10.0.0.3,".repeat(32) + "203.0.113.7")))
                .isEqualTo("10.0.0.2");
        final String padded = " ".repeat(4096 - "203.0.113.7".length()) + "203.0.113.7";
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.0.2", padded)))
                .isEqualTo("203.0.113.7");
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("10.0.0.2", padded + " ")))
                .isEqualTo("10.0.0.2");
    }

    @Test
    @DisplayName("仅 XFF 缺失时采用可信单值 X-Real-IP")
    void realIpOnlyWithoutXff() {
        final MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.2");
        request.addHeader("X-Real-IP", "203.0.113.7");
        assertThat(this.policy.resolve(request)).isEqualTo("203.0.113.7");
        request.addHeader("X-Real-IP", "203.0.113.8");
        assertThat(this.policy.resolve(request)).isEqualTo("10.0.0.2");
        request.removeHeader("X-Real-IP");
        request.addHeader("X-Real-IP", "203.0.113.7,203.0.113.8");
        assertThat(this.policy.resolve(request)).isEqualTo("10.0.0.2");
    }

    @Test
    @DisplayName("IPv6 与映射地址按相同规范化值及 CIDR 匹配")
    void normalizesIpv6AndMappedAddresses() {
        final TrustedProxyPolicy ipv6 = new TrustedProxyPolicy(new TrustedProxyProperties(List.of("2001:db8:1::a/64")));
        assertThat(ipv6.resolve(TrustedProxyPolicyTest.request("2001:db8:1::2", "2001:db8:2::7")))
                .isEqualTo(ipv6.resolve(TrustedProxyPolicyTest.request(
                        "2001:0db8:0001:0000:0000:0000:0000:0002", "2001:db8:2:0:0:0:0:7")));
        assertThat(this.policy.resolve(TrustedProxyPolicyTest.request("::ffff:10.0.0.2", "::ffff:203.0.113.7")))
                .isEqualTo("203.0.113.7");
        for (final String cidr :
                List.of("0.0.0.0/0", "10.0.0.2/32", "::ffff:0:0/96", "::ffff:a00:2/128", "::ffff:a00:0/120")) {
            assertThat(new TrustedProxyPolicy(new TrustedProxyProperties(List.of(cidr)))
                            .resolve(TrustedProxyPolicyTest.request("10.0.0.2", "203.0.113.7")))
                    .isEqualTo("203.0.113.7");
        }
        for (final String cidr : List.of("::/0", "2001:db8::2/128")) {
            assertThat(new TrustedProxyPolicy(new TrustedProxyProperties(List.of(cidr)))
                            .resolve(TrustedProxyPolicyTest.request("2001:db8::2", "203.0.113.7")))
                    .isEqualTo("203.0.113.7");
        }
    }

    @ParameterizedTest
    @ValueSource(
            strings = {
                "",
                "localhost",
                "10.0.0.1/33",
                "::/129",
                "::ffff:0:0/95",
                "10.0.0.1/-1",
                "10.0.0.1/",
                "10.0.0.1/24/x",
                "10.0.0.1/01",
                "[::1]",
                "fe80::1%eth0"
            })
    @DisplayName("非法代理配置拒绝构造")
    void rejectsInvalidConfiguration(final String entry) {
        assertThatIllegalArgumentException()
                .isThrownBy(() -> new TrustedProxyPolicy(new TrustedProxyProperties(List.of(entry))))
                .withMessageContaining("weiran.web.trusted-proxies");
    }

    @Test
    @DisplayName("缓存结果在业务与日志中一致，并保留到后续派发")
    void cachesForConsumers() throws ServletException, IOException {
        final MockHttpServletRequest request = TrustedProxyPolicyTest.request("10.0.0.2", "203.0.113.7");
        final ClientIpFilter filter = new ClientIpFilter(this.policy);
        filter.doFilter(request, new MockHttpServletResponse(), (req, response) -> {
            assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.7");
            request.removeHeader("X-Forwarded-For");
            request.addHeader("X-Forwarded-For", "192.0.2.66");
        });
        assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.7");
        filter.doFilter(
                request,
                new MockHttpServletResponse(),
                (req, response) -> assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.7"));
        final MockHttpServletRequest invalid = TrustedProxyPolicyTest.request("x".repeat(100), "203.0.113.7");
        assertThat(this.policy.resolve(invalid)).isEqualTo("x".repeat(64));
    }
}
