package com.weiran.framework.auth;

import com.weiran.common.error.BizException;
import com.weiran.common.error.CommonErrors;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/**
 * 当前请求的登录用户（ThreadLocal）。
 *
 * <p>由 {@link AuthInterceptor} 在请求进入时写入、在 {@code afterCompletion} 清理；
 * 业务代码只读。线程池里的异步任务拿不到这里的值，需要的话在提交前取出来显式传递。
 */
public final class CurrentUser {

    private static final ThreadLocal<@Nullable LoginUser> HOLDER = new ThreadLocal<>();

    private CurrentUser() {}

    /** 当前用户；未登录为空。 */
    public static Optional<LoginUser> get() {
        return Optional.ofNullable(CurrentUser.HOLDER.get());
    }

    /** 当前用户；未登录抛 401。 */
    public static LoginUser require() {
        return CurrentUser.get().orElseThrow(() -> new BizException(CommonErrors.UNAUTHORIZED));
    }

    /**
     * 以指定用户身份执行一段逻辑，结束后恢复原值。
     *
     * <p>用于测试与后台任务；Web 请求由拦截器负责，不需要调用这里。
     */
    public static void runAs(final LoginUser user, final Runnable action) {
        final LoginUser previous = CurrentUser.HOLDER.get();
        CurrentUser.HOLDER.set(user);
        try {
            action.run();
        } finally {
            CurrentUser.restore(previous);
        }
    }

    static void set(final LoginUser user) {
        CurrentUser.HOLDER.set(user);
    }

    static void clear() {
        CurrentUser.HOLDER.remove();
    }

    private static void restore(final @Nullable LoginUser previous) {
        if (previous == null) {
            CurrentUser.HOLDER.remove();
        } else {
            CurrentUser.HOLDER.set(previous);
        }
    }
}
