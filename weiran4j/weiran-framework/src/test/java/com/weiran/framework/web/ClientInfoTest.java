package com.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

class ClientInfoTest {

    private static final String CHROME_MAC = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

    private static final String EDGE_WINDOWS = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 Edg/126.0.2592.87";

    private static final String SAFARI_IPHONE = "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) "
            + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1";

    private static final String FIREFOX_LINUX =
            "Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:127.0) Gecko/20100101 Firefox/127.0";

    private static final String CHROME_ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 "
            + "(KHTML, like Gecko) Chrome/126.0.6478.71 Mobile Safari/537.36";

    @Test
    @DisplayName("按更具体优先的顺序识别浏览器与操作系统")
    void parsesCommonUserAgents() {
        assertThat(UserAgentParser.parse(ClientInfoTest.CHROME_MAC))
                .isEqualTo(new UserAgentInfo("Chrome 126", "macOS"));
        assertThat(UserAgentParser.parse(ClientInfoTest.EDGE_WINDOWS))
                .isEqualTo(new UserAgentInfo("Edge 126", "Windows"));
        assertThat(UserAgentParser.parse(ClientInfoTest.SAFARI_IPHONE))
                .isEqualTo(new UserAgentInfo("Safari 17", "iOS"));
        assertThat(UserAgentParser.parse(ClientInfoTest.FIREFOX_LINUX))
                .isEqualTo(new UserAgentInfo("Firefox 127", "Linux"));
        assertThat(UserAgentParser.parse(ClientInfoTest.CHROME_ANDROID))
                .isEqualTo(new UserAgentInfo("Chrome 126", "Android"));
        assertThat(UserAgentParser.parse("curl/8.7.1")).isEqualTo(new UserAgentInfo("curl 8", "Unknown"));
        assertThat(UserAgentParser.parse(null)).isEqualTo(new UserAgentInfo("Unknown", "Unknown"));
        assertThat(UserAgentParser.parse("something")).isEqualTo(new UserAgentInfo("Unknown", "Unknown"));
    }

    @Test
    @DisplayName("客户端 IP 优先取 X-Forwarded-For 第一个，其次 X-Real-IP，最后 remoteAddr")
    void resolvesClientIp() {
        final MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRemoteAddr("10.0.0.1");
        assertThat(ClientIpResolver.resolve(request)).isEqualTo("10.0.0.1");

        request.addHeader("X-Real-IP", "172.16.0.9");
        assertThat(ClientIpResolver.resolve(request)).isEqualTo("172.16.0.9");

        request.addHeader("X-Forwarded-For", " 203.0.113.7 , 10.0.0.2");
        assertThat(ClientIpResolver.resolve(request)).isEqualTo("203.0.113.7");

        final MockHttpServletRequest unknown = new MockHttpServletRequest();
        unknown.addHeader("X-Forwarded-For", "unknown");
        unknown.setRemoteAddr("127.0.0.1");
        assertThat(ClientIpResolver.resolve(unknown)).isEqualTo("127.0.0.1");
    }
}
