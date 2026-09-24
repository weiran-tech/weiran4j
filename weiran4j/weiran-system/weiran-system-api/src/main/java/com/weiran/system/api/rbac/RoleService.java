package com.weiran.system.api.rbac;

import com.weiran.common.page.PageResult;
import java.util.List;

/**
 * 角色管理对外服务。
 *
 * <p>适配层只依赖这个接口，实现在 application 层。角色的权限分配保存操作是整体替换语义，
 * 见 {@link #assignPermissions}。
 */
public interface RoleService {

    /** 分页查询角色列表。 */
    PageResult<RoleView> list(RoleQuery query);

    /** 查角色详情，附带已绑定权限 ID 集合。 */
    RoleDetailView findById(long roleId);

    /** 新增角色。 */
    RoleView create(CreateRoleCommand command);

    /** 编辑角色。系统内置角色的 {@code name} 不在编辑命令类型里，天然不可改。 */
    RoleView update(long roleId, UpdateRoleCommand command);

    /** 删除角色。系统内置角色拒绝删除。 */
    void delete(long roleId);

    /** 整体替换角色的权限集合。 */
    void assignPermissions(long roleId, AssignPermissionsCommand command);

    /** 查全部权限点，按 group/module 分组供前端渲染权限树。 */
    List<PermissionView> listPermissions();
}
