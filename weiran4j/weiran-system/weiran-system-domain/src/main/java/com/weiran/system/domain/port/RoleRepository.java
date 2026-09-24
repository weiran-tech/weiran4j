package com.weiran.system.domain.port;

import com.weiran.common.page.PageQuery;
import com.weiran.common.page.PageResult;
import com.weiran.system.domain.rbac.PermissionRef;
import com.weiran.system.domain.rbac.RoleAggregate;
import java.util.List;
import java.util.Optional;
import org.jspecify.annotations.Nullable;

/** 角色管理仓储端口。 */
public interface RoleRepository {

    /** 分页查询角色列表，按账号类型与启用状态可选筛选。 */
    PageResult<RoleAggregate> list(PageQuery page, @Nullable String accountType, @Nullable Boolean enabled);

    /** 按 ID 查角色。 */
    Optional<RoleAggregate> findById(long roleId);

    /** 新增角色，返回落库后的角色（含生成的 ID）。 */
    RoleAggregate insert(RoleAggregate role);

    /** 更新角色的可变字段。 */
    void update(RoleAggregate role);

    /** 删除角色。 */
    void delete(long roleId);

    /** 查角色当前绑定的权限 ID 集合。 */
    List<Long> findPermissionIds(long roleId);

    /**
     * 整体替换角色的权限集合：保存后该角色实际持有的权限精确等于 {@code permissionIds}。
     *
     * <p>实现必须走"先按 roleId 删全部旧记录，再批量插入新集合"策略——
     * {@code pam_permission_role} 是联合主键 {@code (permission_id, role_id)}，
     * 插入重复行会因主键冲突失败，调用方需保证同一批 {@code permissionIds} 内无重复。
     */
    void replacePermissions(long roleId, List<Long> permissionIds);

    /** 查全部权限点，供权限树渲染。 */
    List<PermissionRef> listAllPermissions();
}
