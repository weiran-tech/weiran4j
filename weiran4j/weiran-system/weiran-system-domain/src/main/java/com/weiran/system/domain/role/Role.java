package com.weiran.system.domain.role;

import com.weiran.common.error.BizException;
import com.weiran.common.status.EnableStatus;
import java.time.LocalDateTime;
import java.util.regex.Pattern;
import lombok.Builder;
import lombok.Getter;
import org.jspecify.annotations.Nullable;

/**
 * 角色聚合根（不可变）。
 *
 * <p>内置角色（如 {@code super_admin}）不可删除、不可禁用、编码不可修改——
 * 这些角色的编码被代码直接引用，改掉就等于删掉。
 */
@Getter
@Builder(toBuilder = true)
public final class Role {

    /** 角色编码格式：小写字母开头，2–64 位小写字母、数字、下划线。 */
    public static final Pattern CODE_PATTERN = Pattern.compile("^[a-z][a-z0-9_]{1,63}$");

    private final @Nullable Long id;

    private final String name;

    private final String code;

    private final @Nullable String description;

    private final int sort;

    private final EnableStatus status;

    private final boolean builtin;

    private final @Nullable LocalDateTime createdAt;

    private final @Nullable LocalDateTime updatedAt;

    /** 校验角色编码格式，不合法抛 40000。 */
    public static void validateCode(final String code) {
        if (!Role.CODE_PATTERN.matcher(code).matches()) {
            throw BizException.badRequest("code: 需以小写字母开头，由 2–64 位小写字母、数字或下划线组成");
        }
    }

    /** 已持久化角色的 ID。 */
    public long requireId() {
        if (this.id == null) {
            throw new IllegalStateException("角色尚未持久化");
        }
        return this.id;
    }

    /** 是否启用。 */
    public boolean isEnabled() {
        return this.status == EnableStatus.ENABLED;
    }

    /** 修改角色信息：内置角色编码不可改、不可禁用。 */
    public Role withDetails(
            final String name,
            final String code,
            final @Nullable String description,
            final int sort,
            final EnableStatus status) {
        if (this.builtin && !this.code.equals(code)) {
            throw BizException.conflict("内置角色的编码不可修改");
        }
        if (this.builtin && status == EnableStatus.DISABLED) {
            throw BizException.conflict("内置角色不可禁用");
        }
        Role.validateCode(code);
        return this.toBuilder()
                .name(name)
                .code(code)
                .description(description)
                .sort(sort)
                .status(status)
                .build();
    }

    /** 校验能否删除：内置角色不可删，仍有用户绑定时不可删。 */
    public void ensureDeletable(final long userCount) {
        if (this.builtin) {
            throw BizException.conflict("内置角色不可删除");
        }
        if (userCount > 0) {
            throw BizException.conflict("角色下仍有 " + userCount + " 个用户，请先解除绑定");
        }
    }
}
