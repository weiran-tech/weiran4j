package com.weiran.system.domain.account;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/**
 * 账号聚合根。
 *
 * <p>对应 {@code pam_account} 表。密码哈希不在本类内计算——算法是可替换策略，
 * 放在 {@link com.weiran.system.domain.port.PasswordHasher} 后面，
 * 否则历史算法（PHP 版的 md5+sha1）就会被焊死在领域模型里。
 */
@Getter
@Builder(toBuilder = true)
public final class Account {

    private final long id;

    private final String username;

    private final String mobile;

    private final String email;

    private final AccountType type;

    /** 密码哈希。可能为空：验证码登录创建的账号尚未设置过密码。 */
    private final @Nullable String passwordHash;

    /** 密码盐值（PHP 版的 {@code password_key}），迁移期用于校验历史哈希。 */
    private final @Nullable String passwordKey;

    private final boolean enabled;

    private final String disableReason;

    private final @Nullable LocalDateTime disableStartAt;

    private final @Nullable LocalDateTime disableEndAt;

    private final int loginTimes;

    private final @Nullable LocalDateTime loginedAt;

    /** 最近一次登录来源 IP。 */
    private final @Nullable String loginIp;

    private final LocalDateTime createdAt;

    /**
     * 校验账号当前是否允许登录，不允许则抛出携带原因的业务异常。
     *
     * <p>禁用有两种形态：永久禁用（{@code enabled=false}）与限期封禁（禁用时间窗覆盖当前时刻）。
     * 两者都必须拦住，只查 {@code enabled} 会让限期封禁形同虚设。
     */
    public void ensureLoginable(final LocalDateTime now) {
        if (!this.enabled) {
            throw new ErrorCodeException(SystemErrors.ACCOUNT_DISABLED, this.disabledMessage());
        }
        if (this.isWithinBanWindow(now)) {
            throw new ErrorCodeException(SystemErrors.ACCOUNT_BANNED, this.disabledMessage());
        }
    }

    /** 判断给定时刻是否落在限期封禁窗口内。 */
    public boolean isWithinBanWindow(final LocalDateTime now) {
        if (this.disableStartAt == null || this.disableEndAt == null) {
            return false;
        }
        return !now.isBefore(this.disableStartAt) && !now.isAfter(this.disableEndAt);
    }

    /** 返回登录时展示给调用方的名称，优先用户名，其次手机号、邮箱，最后回落到账号 ID。 */
    public String displayName() {
        if (!this.username.isBlank()) {
            return this.username;
        }
        if (!this.mobile.isBlank()) {
            return this.mobile;
        }
        if (!this.email.isBlank()) {
            return this.email;
        }
        return String.valueOf(this.id);
    }

    private String disabledMessage() {
        return this.disableReason.isBlank() ? "账号已被禁用" : this.disableReason;
    }
}
