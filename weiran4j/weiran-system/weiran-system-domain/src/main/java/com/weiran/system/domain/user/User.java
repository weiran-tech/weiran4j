package com.weiran.system.domain.user;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import java.time.LocalDateTime;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/**
 * 用户聚合根（不可变，变更方法返回新实例）。
 *
 * <p>令牌吊销靠 {@link #tokenVersion}：改密码、被重置密码、被禁用时加一，
 * 已签发令牌里的 {@code ver} 与之不符即失效。
 */
@Getter
@Builder(toBuilder = true)
public final class User {

    private final @Nullable Long id;

    private final String username;

    private final String nickname;

    private final String passwordHash;

    private final @Nullable String email;

    private final @Nullable String phone;

    private final @Nullable String avatar;

    private final Gender gender;

    private final @Nullable Long departmentId;

    private final EnableStatus status;

    private final int tokenVersion;

    private final @Nullable LocalDateTime lastLoginAt;

    private final @Nullable String lastLoginIp;

    private final @Nullable LocalDateTime passwordUpdatedAt;

    private final boolean builtin;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 已持久化用户的 ID；新建未保存的用户调用会抛异常。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("用户尚未持久化");
        }
        return this.id;
    }

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == EnableStatus.ENABLED;
    }

    /** 修改个人资料。 */
    public User withProfile(
            final String nickname,
            final @Nullable String email,
            final @Nullable String phone,
            final @Nullable String avatar,
            final Gender gender) {
        return this.toBuilder()
                .nickname(nickname)
                .email(email)
                .phone(phone)
                .avatar(avatar)
                .gender(gender)
                .build();
    }

    /**
     * 管理员调整部门与状态。
     *
     * <p>内置用户不可禁用；启用 → 禁用时令牌版本加一，已登录的会话立即失效。
     */
    public User withAssignment(final @Nullable Long departmentId, final EnableStatus status) {
        if (this.builtin && status == EnableStatus.DISABLED) {
            throw BizException.conflict("内置用户不可禁用");
        }
        final boolean disabling = this.isEnabled() && status == EnableStatus.DISABLED;
        return this.toBuilder()
                .departmentId(departmentId)
                .status(status)
                .tokenVersion(disabling ? this.tokenVersion + 1 : this.tokenVersion)
                .build();
    }

    /** 更换密码（自己改或管理员重置）：令牌版本加一。 */
    public User withPassword(final String newHash, final LocalDateTime now) {
        return this.toBuilder()
                .passwordHash(newHash)
                .passwordUpdatedAt(now)
                .tokenVersion(this.tokenVersion + 1)
                .build();
    }

    /** 记录一次成功登录。 */
    public User withLogin(final String ip, final LocalDateTime now) {
        return this.toBuilder().lastLoginAt(now).lastLoginIp(ip).build();
    }

    /** 校验能否被 {@code operatorId} 删除：内置用户与当前登录用户自身都不能删。 */
    public void ensureDeletableBy(final long operatorId) {
        if (this.builtin) {
            throw BizException.conflict("内置用户不可删除");
        }
        if (this.id != null && this.id == operatorId) {
            throw BizException.conflict("不能删除当前登录用户");
        }
    }
}
