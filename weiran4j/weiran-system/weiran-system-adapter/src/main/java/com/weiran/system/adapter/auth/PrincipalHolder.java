package com.weiran.system.adapter.auth;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import com.weiran.system.domain.rbac.AuthorizedPrincipal;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * 当前请求的授权快照，以及认证失败的原因。
 *
 * <p>wuli3 的 {@code AuthContext} 只带主体 ID / 类型 / 名称，不带角色与权限——
 * 它是为跨服务传播设计的，字段刻意最小。而按钮级鉴权需要完整权限集合，
 * 所以这里额外挂一个请求级 holder，避免每个鉴权点重新解析令牌、重新查库。
 *
 * <p><b>为什么还要记住失败原因</b>：令牌解析发生在 wuli3 的 {@code ContextFilter} 里，
 * 那是 Servlet 过滤器，在 Spring MVC 的 {@code @ControllerAdvice} 之外——
 * 在那里抛业务异常，统一异常处理根本接不到，客户端只会收到 500。
 * 因此解析失败时不抛，把异常记在这里，等 Controller 调 {@link #require()} 时
 * 在 MVC 内部重新抛出，才能正确映射成 401。
 *
 * <p>用 {@code ThreadLocal} 而不是 request attribute：鉴权发生在 Controller 之内，
 * 拿不到 request 的地方（如领域服务）也要能问「当前是谁」。
 * 由 {@link #clear()} 在过滤器 finally 里清理，否则线程池复用会串号。
 */
public final class PrincipalHolder {

    private static final ThreadLocal<@Nullable AuthorizedPrincipal> CURRENT = new ThreadLocal<>();

    private static final ThreadLocal<@Nullable ErrorCodeException> FAILURE = new ThreadLocal<>();

    /** 写入当前请求的授权快照。 */
    public void set(final AuthorizedPrincipal principal) {
        PrincipalHolder.CURRENT.set(principal);
        PrincipalHolder.FAILURE.remove();
    }

    /** 记录本次请求的认证失败原因，留待 Controller 层重新抛出。 */
    public void fail(final ErrorCodeException failure) {
        PrincipalHolder.CURRENT.remove();
        PrincipalHolder.FAILURE.set(failure);
    }

    /** 取当前授权快照；匿名或认证失败时为空。 */
    public Optional<AuthorizedPrincipal> current() {
        return Optional.ofNullable(PrincipalHolder.CURRENT.get());
    }

    /**
     * 取当前授权快照，未认证则抛出。
     *
     * <p>带了无效令牌时抛出解析阶段记下的**具体**原因（过期 / 失效 / 非法），
     * 而不是笼统的「令牌无效」——前端要靠这个区分「重新登录」和「密码已改」。
     * 完全没带令牌时才回落到 {@link SystemErrors#TOKEN_INVALID}。
     */
    public AuthorizedPrincipal require() {
        final AuthorizedPrincipal principal = PrincipalHolder.CURRENT.get();
        if (principal != null) {
            return principal;
        }
        final ErrorCodeException failure = PrincipalHolder.FAILURE.get();
        throw failure == null ? new ErrorCodeException(SystemErrors.TOKEN_INVALID) : failure;
    }

    /** 清理线程绑定。必须在请求结束时调用，否则线程池复用会把身份串给下一个请求。 */
    public void clear() {
        PrincipalHolder.CURRENT.remove();
        PrincipalHolder.FAILURE.remove();
    }
}
