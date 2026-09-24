package com.weiran.system.infrastructure.persistence.mapper;

import java.util.List;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;

/**
 * {@code pam_permission_role} 表 Mapper。
 *
 * <p>刻意不继承 {@code BaseMapper}：该表主键是联合主键 {@code (permission_id, role_id)}，
 * 单字段 {@code @TableId} 无法表达，直接用具名 SQL 更清晰——插入依赖联合主键天然去重，
 * 角色权限"整体替换"的写入策略见 {@code MyBatisRoleRepository#replacePermissions}。
 */
@Mapper
public interface PamPermissionRoleMapper {

    @Select("SELECT permission_id FROM pam_permission_role WHERE role_id = #{roleId}")
    List<Long> selectPermissionIdsByRoleId(@Param("roleId") long roleId);

    @Insert("INSERT INTO pam_permission_role (permission_id, role_id) VALUES (#{permissionId}, #{roleId})")
    int insert(@Param("permissionId") long permissionId, @Param("roleId") long roleId);

    @Delete("DELETE FROM pam_permission_role WHERE role_id = #{roleId}")
    int deleteByRoleId(@Param("roleId") long roleId);
}
