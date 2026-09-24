package com.weiran.system.adapter.auth;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import lombok.RequiredArgsConstructor;
import org.springframework.core.Ordered;
import org.springframework.web.filter.OncePerRequestFilter;

/**
 * 请求结束时清理授权快照的线程绑定。
 *
 * <p>只做清理，不做认证——认证由 wuli3 的 {@code ContextFilter} 调
 * {@link WeiranAuthContextResolver} 完成。这个过滤器必须排在**更外层**（Order 更小），
 * 否则认证过滤器写入的 ThreadLocal 会在它的 finally 之外泄漏到线程池的下一个请求。
 */
@RequiredArgsConstructor
public class PrincipalHolderCleanupFilter extends OncePerRequestFilter implements Ordered {

    /** 排在 wuli3 ContextFilter 之外。 */
    public static final int ORDER = Ordered.HIGHEST_PRECEDENCE + 10;

    private final PrincipalHolder principalHolder;

    @Override
    public int getOrder() {
        return PrincipalHolderCleanupFilter.ORDER;
    }

    @Override
    protected void doFilterInternal(
            final HttpServletRequest request, final HttpServletResponse response, final FilterChain filterChain)
            throws ServletException, IOException {
        try {
            filterChain.doFilter(request, response);
        } finally {
            this.principalHolder.clear();
        }
    }
}
