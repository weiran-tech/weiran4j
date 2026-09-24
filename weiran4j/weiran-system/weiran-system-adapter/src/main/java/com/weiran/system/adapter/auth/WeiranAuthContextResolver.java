package com.weiran.system.adapter.auth;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.kjs.wuli3.propagation.context.AuthContext;
import com.kjs.wuli3.propagation.context.PrincipalType;
import com.kjs.wuli3.web.auth.AuthContextResolver;
import com.weiran.system.application.auth.AuthApplicationService;
import com.weiran.system.domain.account.AccountType;
import com.weiran.system.domain.rbac.AuthorizedPrincipal;
import jakarta.servlet.http.HttpServletRequest;
import java.util.Optional;
import lombok.RequiredArgsConstructor;

/**
 * 从 {@code Authorization: Bearer <token>} 解析认证上下文。
 *
 * <p>替换 wuli3 默认的 {@code TrustedHttpAuthContextResolver}——那个实现信任内部调用方
 * 直接在请求头里声明身份，只适用于网关之后的可信链路。weiran4j 直接面向外部请求，
 * 必须自己验签。
 *
 * <p>本方法**不抛异常**：它运行在 Servlet 过滤器里，位于 Spring MVC 的
 * {@code @ControllerAdvice} 之外，在这里抛业务异常只会变成 500。
 * 令牌无效时把原因记进 {@link PrincipalHolder#fail}，由 Controller 调
 * {@link PrincipalHolder#require()} 时在 MVC 内部重新抛出，才能正确映射成 401。
 *
 * <p>「没带令牌」与「带了个无效令牌」仍然是两件事，区别落在 holder 的失败原因上，
 * 而不是靠返回值区分——对底座而言两者都是「本次请求没有可用的认证上下文」。
 */
@RequiredArgsConstructor
public class WeiranAuthContextResolver implements AuthContextResolver {

    /** 认证请求头名称。 */
    public static final String HEADER = "Authorization";

    /** Bearer 方案前缀。 */
    public static final String BEARER_PREFIX = "Bearer ";

    private final AuthApplicationService authApplicationService;

    private final PrincipalHolder principalHolder;

    @Override
    public Optional<AuthContext> resolve(final HttpServletRequest request) {
        final Optional<String> token = WeiranAuthContextResolver.bearerToken(request);
        if (token.isEmpty()) {
            return Optional.empty();
        }

        try {
            final AuthorizedPrincipal principal = this.authApplicationService.authorize(token.get());
            this.principalHolder.set(principal);
            return Optional.of(new AuthContext(
                    WeiranAuthContextResolver.principalTypeOf(principal.accountType()),
                    String.valueOf(principal.accountId()),
                    principal.displayName()));
        } catch (final ErrorCodeException failure) {
            this.principalHolder.fail(failure);
            return Optional.empty();
        }
    }

    /** 从请求头取出 Bearer 令牌，缺失或方案不符时返回空。 */
    public static Optional<String> bearerToken(final HttpServletRequest request) {
        final String header = request.getHeader(WeiranAuthContextResolver.HEADER);
        if (header == null || !header.startsWith(WeiranAuthContextResolver.BEARER_PREFIX)) {
            return Optional.empty();
        }
        final String token = header.substring(WeiranAuthContextResolver.BEARER_PREFIX.length())
                .trim();
        return token.isEmpty() ? Optional.empty() : Optional.of(token);
    }

    private static PrincipalType principalTypeOf(final String accountType) {
        return AccountType.fromCode(accountType) == AccountType.BACKEND ? PrincipalType.ADMIN : PrincipalType.CUSTOMER;
    }
}
