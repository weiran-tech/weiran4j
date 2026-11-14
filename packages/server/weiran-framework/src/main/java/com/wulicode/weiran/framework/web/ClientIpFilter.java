package com.wulicode.weiran.framework.web;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** 在认证及业务消费 IP 之前解析一次，请求结束和后续派发沿用同一结果。 */
public final class ClientIpFilter extends OncePerRequestFilter {
    private final TrustedProxyPolicy policy;

    public ClientIpFilter(final TrustedProxyPolicy policy) {
        this.policy = policy;
    }

    @Override
    protected void doFilterInternal(
            final HttpServletRequest request, final HttpServletResponse response, final FilterChain chain)
            throws ServletException, IOException {
        if (request.getAttribute(ClientIpResolver.ATTRIBUTE) == null) {
            request.setAttribute(ClientIpResolver.ATTRIBUTE, this.policy.resolve(request));
        }
        chain.doFilter(request, response);
    }
}
