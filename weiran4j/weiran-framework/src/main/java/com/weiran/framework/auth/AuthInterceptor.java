package com.weiran.framework.auth;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import java.util.Optional;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 认证与权限拦截器，只注册在 {@code /api/**}。
 *
 * <p>流程：读 {@code Authorization: Bearer} → {@link TokenAuthenticator} → 写入 {@link CurrentUser} →
 * 非 {@link PublicApi} 且未登录抛 401 → 不满足 {@link RequiresPermission} 抛 403。
 * 异常由全局异常处理器统一输出（拦截器运行在 DispatcherServlet 内，能被 {@code @ExceptionHandler} 接到）。
 *
 * <p>注意 {@code preHandle} 抛异常时本拦截器的 {@code afterCompletion} 不会被调用，
 * 所以用户只在全部检查通过后才写入 ThreadLocal，否则 Tomcat 线程复用时会把上一个用户带进下一个请求。
 */
public class AuthInterceptor implements HandlerInterceptor {

    private static final String BEARER_PREFIX = "bearer ";

    private final ObjectProvider<TokenAuthenticator> authenticators;

    /** 构造拦截器；没有任何 {@link TokenAuthenticator} 时所有非公开接口都返回 401。 */
    public AuthInterceptor(final ObjectProvider<TokenAuthenticator> authenticators) {
        this.authenticators = authenticators;
    }

    @Override
    public boolean preHandle(
            final HttpServletRequest request, final HttpServletResponse response, final Object handler) {
        if (!(handler instanceof final HandlerMethod handlerMethod)) {
            // 静态资源、404 等非 Controller 处理器：交给后续流程（通常是 NoResourceFound → 40400）。
            return true;
        }
        final Optional<LoginUser> user = this.authenticate(request);
        if (!AuthInterceptor.isPublic(handlerMethod)) {
            final LoginUser loginUser = user.orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
            final RequiresPermission required = AuthInterceptor.requiredPermission(handlerMethod);
            if (required != null && !loginUser.hasPermissions(required.value(), required.logical())) {
                throw new BizException(CommonErrors.FORBIDDEN);
            }
        }
        user.ifPresent(CurrentUser::set);
        return true;
    }

    @Override
    public void afterCompletion(
            final HttpServletRequest request,
            final HttpServletResponse response,
            final Object handler,
            final @Nullable Exception ex) {
        CurrentUser.clear();
    }

    private Optional<LoginUser> authenticate(final HttpServletRequest request) {
        final String token = AuthInterceptor.bearerToken(request);
        if (token == null) {
            return Optional.empty();
        }
        final TokenAuthenticator authenticator = this.authenticators.getIfAvailable();
        return authenticator == null ? Optional.empty() : authenticator.authenticate(token);
    }

    private static @Nullable String bearerToken(final HttpServletRequest request) {
        final String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || header.length() <= AuthInterceptor.BEARER_PREFIX.length()) {
            return null;
        }
        final String prefix = header.substring(0, AuthInterceptor.BEARER_PREFIX.length());
        if (!AuthInterceptor.BEARER_PREFIX.equals(prefix.toLowerCase(Locale.ROOT))) {
            return null;
        }
        final String token =
                header.substring(AuthInterceptor.BEARER_PREFIX.length()).trim();
        return token.isEmpty() ? null : token;
    }

    private static boolean isPublic(final HandlerMethod handlerMethod) {
        return AnnotatedElementUtils.hasAnnotation(handlerMethod.getMethod(), PublicApi.class)
                || AnnotatedElementUtils.hasAnnotation(handlerMethod.getBeanType(), PublicApi.class);
    }

    private static @Nullable RequiresPermission requiredPermission(final HandlerMethod handlerMethod) {
        final RequiresPermission onMethod =
                AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getMethod(), RequiresPermission.class);
        if (onMethod != null) {
            return onMethod;
        }
        return AnnotatedElementUtils.findMergedAnnotation(handlerMethod.getBeanType(), RequiresPermission.class);
    }
}
