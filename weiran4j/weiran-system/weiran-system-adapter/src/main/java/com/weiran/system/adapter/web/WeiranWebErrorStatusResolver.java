package com.weiran.system.adapter.web;

import com.kjs.wuli3.core.error.model.ErrorCode;
import com.kjs.wuli3.web.error.WebErrorStatusResolver;
import com.weiran.system.domain.error.SystemErrors;
import java.util.Map;
import java.util.Objects;
import org.springframework.http.HttpStatus;

/**
 * 认证类错误的 HTTP 状态映射。
 *
 * <p>wuli3 默认按 {@code ErrorOrigin} 映射：{@code CALLER} → 400、{@code SERVER} → 500。
 * 对认证错误这个粒度不够——前端需要靠 401 触发重新登录、靠 403 显示无权页面，
 * 全都收成 400 会让「令牌过期」和「参数写错」在前端长得一模一样。
 *
 * <p>因此这里对 {@code SystemErrors} 的认证子集显式指定状态码，其余一律委托回默认实现，
 * 不重复底座的判定逻辑。
 */
public final class WeiranWebErrorStatusResolver implements WebErrorStatusResolver {

    private static final Map<ErrorCode, HttpStatus> OVERRIDES = Map.of(
            SystemErrors.TOKEN_INVALID, HttpStatus.UNAUTHORIZED,
            SystemErrors.TOKEN_EXPIRED, HttpStatus.UNAUTHORIZED,
            SystemErrors.TOKEN_STALE, HttpStatus.UNAUTHORIZED,
            SystemErrors.BAD_CREDENTIALS, HttpStatus.UNAUTHORIZED,
            SystemErrors.PERMISSION_DENIED, HttpStatus.FORBIDDEN,
            SystemErrors.ACCOUNT_DISABLED, HttpStatus.FORBIDDEN,
            SystemErrors.ACCOUNT_BANNED, HttpStatus.FORBIDDEN);

    private final WebErrorStatusResolver delegate;

    /** 用底座默认实现作为兜底。 */
    public WeiranWebErrorStatusResolver(final WebErrorStatusResolver delegate) {
        this.delegate = Objects.requireNonNull(delegate, "delegate");
    }

    @Override
    public HttpStatus resolve(final Throwable error, final ErrorCode responseCode) {
        final HttpStatus override = WeiranWebErrorStatusResolver.OVERRIDES.get(responseCode);
        return override == null ? this.delegate.resolve(error, responseCode) : override;
    }
}
