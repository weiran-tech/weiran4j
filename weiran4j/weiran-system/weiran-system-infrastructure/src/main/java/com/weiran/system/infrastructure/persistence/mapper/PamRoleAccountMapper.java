package com.weiran.system.infrastructure.persistence.mapper;

import com.weiran.system.infrastructure.persistence.entity.PamRoleAccountDO;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

/**
 * {@code pam_role_account} 表 Mapper。
 *
 * <p>刻意不继承 {@code BaseMapper}：该表既无主键也无唯一约束，
 * {@code BaseMapper} 的按 ID 操作无从谈起，直接用具名 SQL 更清晰。
 */
@Mapper
public interface PamRoleAccountMapper {

    @Insert("INSERT INTO pam_role_account (account_id, role_id) VALUES (#{record.accountId}, #{record.roleId})")
    int insert(@Param("record") PamRoleAccountDO record);

    @Delete("DELETE FROM pam_role_account WHERE role_id = #{roleId}")
    int deleteByRoleId(@Param("roleId") long roleId);
}
