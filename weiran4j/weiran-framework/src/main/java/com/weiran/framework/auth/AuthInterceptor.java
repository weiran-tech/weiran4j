package com.weiran.framework.auth;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Locale;
import java.util.Optional;
import java.util.OptionalLong;
import java.util.Set;
import lombok.extern.slf4j.Slf4j;
import org.jspecify.annotations.Nullable;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.core.annotation.AnnotatedElementUtils;
import org.springframework.http.HttpHeaders;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/**
 * 认证与权限拦截器，只注册在 {@code /api/**}。
 *
 * <p>流程：取令牌（{@code Authorization: Bearer} 优先，其次 {@value AuthCookies#TOKEN_COOKIE} Cookie）→
 * {@link TokenAuthenticator} → 非 {@link PublicApi} 且未登录抛 401 → 以 Cookie 认证的写请求做 CSRF 双提交校验（不通过抛 403 /
 * 40302）→ 不满足 {@link RequiresPermission} 抛 403 → 写入 {@link CurrentUser}。
 * 异常由全局异常处理器统一输出（拦截器运行在 DispatcherServlet 内，能被 {@code @ExceptionHandler} 接到）。
 *
 * <p>CSRF 只查「Cookie 认证 + 非公开接口 + 写方法」：Bearer 头不会被浏览器自动附带，不存在跨站伪造；
 * 公开接口（如登录）此时还没有 CSRF 值，而跨站的 JSON POST 本就会被 CORS 预检挡住。
 *
 * <p>注意 {@code preHandle} 抛异常时本拦截器的 {@code afterCompletion} 不会被调用，
 * 所以用户只在全部检查通过后才写入 ThreadLocal，否则 Tomcat 线程复用时会把上一个用户带进下一个请求。
 */
@Slf4j
public class AuthInterceptor implements HandlerInterceptor {

    /** 当前用户 ID 的请求属性名：给 {@code RequestIdFilter} 的访问日志用（{@link CurrentUser} 在 afterCompletion 就清掉了）。 */
    public static final String USER_ID_ATTRIBUTE = AuthInterceptor.class.getName() + ".userId";

    private static final String BEARER_PREFIX = "bearer ";

    /** 需要 CSRF 校验的方法；GET / HEAD / OPTIONS 不改状态，不查。 */
    private static final Set<String> UNSAFE_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    /** 令牌来源：决定是否需要 CSRF 校验。 */
    private enum Source {
        BEARER,
        COOKIE
    }

    /** 请求里取到的令牌与来源。 */
    private record Credential(String token, Source source) {}

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
        final Credential credential = AuthInterceptor.credential(request);
        final Optional<LoginUser> user = credential == null ? Optional.empty() : this.authenticate(credential.token());
        if (!AuthInterceptor.isPublic(handlerMethod)) {
            final LoginUser loginUser = user.orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
            if (credential != null && credential.source() == Source.COOKIE) {
                AuthInterceptor.checkCsrf(request, loginUser);
            }
            final RequiresPermission required = AuthInterceptor.requiredPermission(handlerMethod);
            if (required != null && !loginUser.hasPermissions(required.value(), required.logical())) {
                throw new BizException(CommonErrors.FORBIDDEN);
            }
        }
        user.ifPresent(loginUser -> {
            CurrentUser.set(loginUser);
            request.setAttribute(AuthInterceptor.USER_ID_ATTRIBUTE, loginUser.id());
        });
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

    private Optional<LoginUser> authenticate(final String token) {
        final TokenAuthenticator authenticator = this.authenticators.getIfAvailable();
        return authenticator == null ? Optional.empty() : authenticator.authenticate(token);
    }

    private static @Nullable Credential credential(final HttpServletRequest request) {
        final String bearer = AuthInterceptor.bearerToken(request);
        if (bearer != null) {
            return new Credential(bearer, Source.BEARER);
        }
        final String cookie = AuthInterceptor.cookie(request, AuthCookies.TOKEN_COOKIE);
        return cookie == null ? null : new Credential(cookie, Source.COOKIE);
    }

    /** 双提交校验：头与 Cookie 都在、逐字节相等（常量时间比较），且 CSRF 值属于当前用户。 */
    private static void checkCsrf(final HttpServletRequest request, final LoginUser user) {
        if (!AuthInterceptor.UNSAFE_METHODS.contains(request.getMethod().toUpperCase(Locale.ROOT))) {
            return;
        }
        final String header = request.getHeader(AuthCookies.CSRF_HEADER);
        final String cookie = AuthInterceptor.cookie(request, AuthCookies.CSRF_COOKIE);
        final String reason;
        if (header == null || header.isEmpty() || cookie == null) {
            reason = "缺少 CSRF 头或 Cookie";
        } else if (!MessageDigest.isEqual(
                header.getBytes(StandardCharsets.UTF_8), cookie.getBytes(StandardCharsets.UTF_8))) {
            reason = "CSRF 头与 Cookie 不一致";
        } else {
            final OptionalLong owner = AuthCookies.csrfUserId(cookie);
            if (owner.isPresent() && owner.getAsLong() == user.id()) {
                return;
            }
            reason = "CSRF 值不属于当前用户";
        }
        // 只记原因，不记头或 Cookie 的值（宪法 CP-9）。
        AuthInterceptor.log.warn("CSRF 校验失败: {} {} - {}", request.getMethod(), request.getRequestURI(), reason);
        throw new BizException(CommonErrors.CSRF_REJECTED);
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

    private static @Nullable String cookie(final HttpServletRequest request, final String name) {
        final Cookie[] cookies = request.getCookies();
        if (cookies == null) {
            return null;
        }
        for (final Cookie cookie : cookies) {
            if (name.equals(cookie.getName())) {
                final String value = cookie.getValue();
                return value == null || value.isEmpty() ? null : value;
            }
        }
        return null;
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
