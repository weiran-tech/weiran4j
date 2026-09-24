package com.weiran.system.domain.rbac;

import com.kjs.wuli3.core.error.ErrorCodeException;
import com.weiran.system.domain.error.SystemErrors;
import lombok.Builder;
import lombok.Getter;

/**
 * 角色聚合根，供管理端角色 CRUD 使用。对应 {@code pam_role} 表。
 *
 * <p>与只读值对象 {@link Role}（服务于登录鉴权只读投影）是同一张表的两种不同视角：
 * 本类是可编辑聚合根，承担管理端"定义、启禁用、保护系统角色"的业务规则；{@link Role}
 * 只承担"账号当前持有的角色标识"这一只读快照职责。两者不合并是为了不让单一职责的值对象
 * 承担两种生命周期。
 *
 * <p>{@code system} 标记的角色不允许被业务侧改名——它们的 {@code name} 被代码引用，
 * 删除保护由应用层在删除用例里校验（聚合根本身不暴露删除方法，删除是"记录消失"而非
 * 聚合根状态迁移，因此不建模为实例方法）。
 */
@Getter
@Builder(toBuilder = true)
public final class RoleAggregate {

    private final long id;

    /** 角色标识，代码里引用的就是它，全局唯一。 */
    private final String name;

    private final String title;

    private final String description;

    /** 该角色适用的账号类型，与 {@code pam_account.type} 同域。 */
    private final String accountType;

    private final boolean enabled;

    /** 系统内置角色，不可被业务侧删除或改名。 */
    private final boolean system;

    /**
     * 更新可变资料字段（显示名、描述、启用状态），返回更新后的新实例。
     *
     * <p>不接受 {@code name} 参数：改名请求从命令类型层面就不提供该字段（见
     * {@code weiran-system-api} 的 {@code UpdateRoleCommand}），"系统内置角色的 name
     * 不可被编辑接口修改"这条不变量因此在类型层面天然成立，不需要运行时校验
     * 去防御一个根本传不进来的输入。
     */
    public RoleAggregate updateProfile(final String newTitle, final String newDescription, final boolean newEnabled) {
        return this.toBuilder()
                .title(newTitle)
                .description(newDescription)
                .enabled(newEnabled)
                .build();
    }

    /** 校验该角色是否允许被删除，系统内置角色拒绝删除。 */
    public void ensureDeletable() {
        if (this.system) {
            throw new ErrorCodeException(SystemErrors.SYSTEM_ROLE_NOT_DELETABLE);
        }
    }
}
