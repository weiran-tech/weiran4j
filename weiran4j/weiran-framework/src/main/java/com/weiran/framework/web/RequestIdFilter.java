package com.weiran.framework.web;

import com.weiran.framework.auth.AuthInterceptor;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import java.util.UUID;
import java.util.regex.Pattern;
import org.jspecify.annotations.Nullable;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 请求号与访问日志（契约 §4）。
 *
 * <p>每个请求一个请求号：入站 {@value #HEADER} 合法（{@code [A-Za-z0-9_-]{1,64}}）就沿用，便于和 Nginx / 网关日志串联；
 * 否则生成 32 位十六进制。写入 MDC（{@value #MDC_KEY}，日志格式里的 {@code %X{requestId}}）与响应头，
 * 响应头在进入链路<b>之前</b>设置——响应一旦提交就加不上了。不合法的入站值直接丢弃、不进日志，防日志注入。
 *
 * <p>请求结束时对 {@code /api/**} 打一行访问日志（logger {@value #ACCESS_LOGGER}）：方法、路径、状态码、耗时、
 * 用户、IP；<b>不记</b>请求体和查询参数（写接口另有脱敏的操作日志）。健康检查只打 DEBUG，免得探活刷屏。
 * 用户 ID 由 {@link AuthInterceptor} 写进请求属性——{@code CurrentUser} 在拦截器的 afterCompletion 就清掉了。
 */
public class RequestIdFilter extends OncePerRequestFilter {

    /** 请求号的请求头与响应头。 */
    public static final String HEADER = "X-Request-Id";

    /** 请求号的 MDC 键。 */
    public static final String MDC_KEY = "requestId";

    /** 访问日志的 logger 名，可单独调级别。 */
    public static final String ACCESS_LOGGER = "com.weiran.access";

    private static final Logger ACCESS_LOG = LoggerFactory.getLogger(RequestIdFilter.ACCESS_LOGGER);

    private static final Pattern VALID_ID = Pattern.compile("[A-Za-z0-9_-]{1,64}");

    private static final String API_PREFIX = "/api/";

    private static final String HEALTH_PATH = "/api/health";

    private static final long NANOS_PER_MILLI = 1_000_000L;

    @Override
    protected void doFilterInternal(
            final HttpServletRequest request, final HttpServletResponse response, final FilterChain chain)
            throws ServletException, IOException {
        final String requestId = RequestIdFilter.resolve(request.getHeader(RequestIdFilter.HEADER));
        final long start = System.nanoTime();
        MDC.put(RequestIdFilter.MDC_KEY, requestId);
        response.setHeader(RequestIdFilter.HEADER, requestId);
        try {
            chain.doFilter(request, response);
        } finally {
            RequestIdFilter.logAccess(request, response, (System.nanoTime() - start) / RequestIdFilter.NANOS_PER_MILLI);
            MDC.remove(RequestIdFilter.MDC_KEY);
        }
    }

    /** 合法的入站值原样沿用，否则生成新的。 */
    static String resolve(final @Nullable String inbound) {
        if (inbound != null && RequestIdFilter.VALID_ID.matcher(inbound).matches()) {
            return inbound;
        }
        return UUID.randomUUID().toString().replace("-", "");
    }

    private static void logAccess(final HttpServletRequest request, final HttpServletResponse response, final long ms) {
        final String path = request.getRequestURI();
        if (!path.startsWith(RequestIdFilter.API_PREFIX)) {
            return;
        }
        final boolean health = RequestIdFilter.HEALTH_PATH.equals(path);
        if (health ? !RequestIdFilter.ACCESS_LOG.isDebugEnabled() : !RequestIdFilter.ACCESS_LOG.isInfoEnabled()) {
            return;
        }
        final Object userId = request.getAttribute(AuthInterceptor.USER_ID_ATTRIBUTE);
        final String user = userId == null ? "-" : userId.toString();
        final String ip = ClientIpResolver.resolve(request);
        final String format = "{} {} {} {}ms user={} ip={}";
        if (health) {
            RequestIdFilter.ACCESS_LOG.debug(format, request.getMethod(), path, response.getStatus(), ms, user, ip);
        } else {
            RequestIdFilter.ACCESS_LOG.info(format, request.getMethod(), path, response.getStatus(), ms, user, ip);
        }
    }
}
