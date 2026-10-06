package com.weiran.framework.web;

import static org.assertj.core.api.Assertions.assertThat;

import ch.qos.logback.classic.Level;
import ch.qos.logback.classic.Logger;
import ch.qos.logback.classic.spi.ILoggingEvent;
import ch.qos.logback.core.read.ListAppender;
import com.weiran.framework.auth.AuthInterceptor;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class RequestIdFilterTest {

    private final RequestIdFilter filter = new RequestIdFilter();

    private final Logger accessLogger = (Logger) LoggerFactory.getLogger(RequestIdFilter.ACCESS_LOGGER);

    private final ListAppender<ILoggingEvent> appender = new ListAppender<>();

    @BeforeEach
    void attachAppender() {
        this.appender.start();
        this.accessLogger.addAppender(this.appender);
        this.accessLogger.setLevel(Level.DEBUG);
    }

    @AfterEach
    void detachAppender() {
        this.accessLogger.detachAppender(this.appender);
        this.accessLogger.setLevel(null);
        MDC.clear();
    }

    private MockHttpServletResponse run(final MockHttpServletRequest request, final List<String> seenInChain)
            throws Exception {
        final MockHttpServletResponse response = new MockHttpServletResponse();
        this.filter.doFilter(request, response, new MockFilterChain(new jakarta.servlet.http.HttpServlet() {
            @Override
            protected void service(
                    final jakarta.servlet.http.HttpServletRequest req,
                    final jakarta.servlet.http.HttpServletResponse res) {
                seenInChain.add(MDC.get(RequestIdFilter.MDC_KEY));
                res.setStatus(200);
            }
        }));
        return response;
    }

    @Test
    @DisplayName("合法的入站请求号原样沿用；不合法或缺失时生成 32 位小写十六进制")
    void resolvesRequestId() throws Exception {
        final MockHttpServletRequest inbound = new MockHttpServletRequest("GET", "/api/x");
        inbound.addHeader(RequestIdFilter.HEADER, "gw-123_abc");
        assertThat(this.run(inbound, new ArrayList<>()).getHeader(RequestIdFilter.HEADER))
                .isEqualTo("gw-123_abc");

        final MockHttpServletRequest bad = new MockHttpServletRequest("GET", "/api/x");
        bad.addHeader(RequestIdFilter.HEADER, "bad id\n");
        final String generated = this.run(bad, new ArrayList<>()).getHeader(RequestIdFilter.HEADER);
        assertThat(generated).matches("[0-9a-f]{32}");
        assertThat(this.run(new MockHttpServletRequest("GET", "/api/x"), new ArrayList<>())
                        .getHeader(RequestIdFilter.HEADER))
                .matches("[0-9a-f]{32}")
                .isNotEqualTo(generated);
        assertThat(RequestIdFilter.resolve("x".repeat(65))).matches("[0-9a-f]{32}");
    }

    @Test
    @DisplayName("链路内 MDC 是本请求的请求号，请求结束后清理，同一线程的下一个请求不串号")
    void scopesMdcToRequest() throws Exception {
        final List<String> seen = new ArrayList<>();
        final MockHttpServletRequest first = new MockHttpServletRequest("GET", "/api/x");
        first.addHeader(RequestIdFilter.HEADER, "first");
        this.run(first, seen);
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
        final MockHttpServletRequest second = new MockHttpServletRequest("GET", "/api/x");
        second.addHeader(RequestIdFilter.HEADER, "second");
        this.run(second, seen);
        assertThat(seen).containsExactly("first", "second");
        assertThat(MDC.get(RequestIdFilter.MDC_KEY)).isNull();
    }

    @Test
    @DisplayName("访问日志：一行 INFO，含方法、路径、状态、耗时、用户、IP，不含查询参数的值")
    void logsAccessWithoutQueryValues() throws Exception {
        final MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/auth/profile");
        request.setQueryString("x=secret");
        request.setParameter("x", "secret");
        request.setRemoteAddr("10.0.0.8");
        request.setAttribute(AuthInterceptor.USER_ID_ATTRIBUTE, 7L);
        this.run(request, new ArrayList<>());

        assertThat(this.appender.list).hasSize(1);
        final ILoggingEvent event = this.appender.list.get(0);
        assertThat(event.getLevel()).isEqualTo(Level.INFO);
        assertThat(event.getFormattedMessage())
                .startsWith("PUT /api/auth/profile 200 ")
                .contains("ms user=7 ip=10.0.0.8")
                .doesNotContain("secret");
    }

    @Test
    @DisplayName("未登录记 user=-；健康检查只打 DEBUG；非 /api 路径不打访问日志")
    void levelsAndScope() throws Exception {
        this.run(new MockHttpServletRequest("GET", "/api/auth/me"), new ArrayList<>());
        this.run(new MockHttpServletRequest("GET", "/api/health"), new ArrayList<>());
        this.run(new MockHttpServletRequest("GET", "/index.html"), new ArrayList<>());

        assertThat(this.appender.list).hasSize(2);
        assertThat(this.appender.list.get(0).getFormattedMessage()).contains("user=-");
        assertThat(this.appender.list.get(0).getLevel()).isEqualTo(Level.INFO);
        assertThat(this.appender.list.get(1).getFormattedMessage()).startsWith("GET /api/health ");
        assertThat(this.appender.list.get(1).getLevel()).isEqualTo(Level.DEBUG);
    }
}
