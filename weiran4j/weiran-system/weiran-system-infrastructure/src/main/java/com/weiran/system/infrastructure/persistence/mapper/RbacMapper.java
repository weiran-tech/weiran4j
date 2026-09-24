package com.weiran.system.infrastructure.persistence.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * RBAC 授权查询。
 *
 * <p>刻意不走 {@code BaseMapper}：这里要的是两条 join 查询，用条件构造器拼多表反而更难读。
 * 两条查询各自一次到底，不按角色循环——账号挂多个角色是常态，循环查等于 N+1。
 */
@Mapper
public interface RbacMapper {

    /** 查账号持有的、且处于启用状态的角色标识。 */
    @Select("""
            SELECT r.name
            FROM pam_role_account ra
            JOIN pam_role r ON r.id = ra.role_id
            WHERE ra.account_id = #{accountId}
              AND r.is_enable = 1
            """)
    List<String> selectRoleNamesByAccountId(@Param("accountId") long accountId);

    /** 查账号经由启用角色获得的权限标识，已去重。 */
    @Select("""
            SELECT DISTINCT p.name
            FROM pam_role_account ra
            JOIN pam_role r ON r.id = ra.role_id
            JOIN pam_permission_role pr ON pr.role_id = r.id
            JOIN pam_permission p ON p.id = pr.permission_id
            WHERE ra.account_id = #{accountId}
              AND r.is_enable = 1
            """)
    List<String> selectPermissionNamesByAccountId(@Param("accountId") long accountId);
}
