package com.weiran.cqt.adapter.portal;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import com.weiran.cqt.api.portal.PortalAuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import java.util.OptionalLong;
import org.jspecify.annotations.Nullable;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 前台接口认证拦截器，只注册在 {@code /api-web/**}。
 *
 * <p>读 {@code Authorization: Bearer} → {@link PortalAuthService} 认证（令牌有效且版本与账号一致）→ 非 {@link PortalPublic} 且未登录时抛 401。
 * 两句提示语沿用原系统：uniapp 对它们不弹窗、只把登录态置为未登录。
 *
 * <p>{@code preHandle} 抛异常时本拦截器的 {@code afterCompletion} 不会被调用，所以账号只在检查全部通过后才写入 ThreadLocal。
 */
public class PortalAuthInterceptor implements HandlerInterceptor {

    /** 未带令牌时的提示语。 */
    public static final String MISSING_TOKEN_MESSAGE = "请求参数缺token";

    /** 令牌无效（签名不符、过期、非前台令牌）时的提示语。 */
    public static final String INVALID_TOKEN_MESSAGE = "登录失效,请重新登录";

    private static final String BEARER_PREFIX = "bearer ";

    private final PortalAuthService authService;

    /** 构造拦截器。 */
    public PortalAuthInterceptor(final PortalAuthService authService) {
        this.authService = authService;
    }

    @Override
    public boolean preHandle(
            final HttpServletRequest request, final HttpServletResponse response, final Object handler) {
        if (!(handler instanceof final HandlerMethod handlerMethod)) {
            return true;
        }
        final String token = PortalAuthInterceptor.bearerToken(request);
        final OptionalLong accountId = token == null ? OptionalLong.empty() : this.authService.authenticate(token);
        if (accountId.isEmpty() && !PortalAuthInterceptor.isPublic(handlerMethod)) {
            throw new BizException(
                    CommonErrors.UNAUTHORIZED,
                    token == null
                            ? PortalAuthInterceptor.MISSING_TOKEN_MESSAGE
                            : PortalAuthInterceptor.INVALID_TOKEN_MESSAGE);
        }
        accountId.ifPresent(PortalAccount::set);
        return true;
    }

    @Override
    public void afterCompletion(
            final HttpServletRequest request,
            final HttpServletResponse response,
            final Object handler,
            final @Nullable Exception ex) {
        PortalAccount.clear();
    }

    private static @Nullable String bearerToken(final HttpServletRequest request) {
        final String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || header.length() <= PortalAuthInterceptor.BEARER_PREFIX.length()) {
            return null;
        }
        final String prefix = header.substring(0, PortalAuthInterceptor.BEARER_PREFIX.length());
        if (!PortalAuthInterceptor.BEARER_PREFIX.equals(prefix.toLowerCase(Locale.ROOT))) {
            return null;
        }
        final String token =
                header.substring(PortalAuthInterceptor.BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private static boolean isPublic(final HandlerMethod handlerMethod) {
        return AnnotatedElementUtils.hasAnnotation(handlerMethod.getMethod(), PortalPublic.class)
                || AnnotatedElementUtils.hasAnnotation(handlerMethod.getBeanType(), PortalPublic.class);
    }
}
